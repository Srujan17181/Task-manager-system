import { errorHandler } from "../utils/error.js"
import pool from '../config/db.js'

export const createTask=async (req,res,next)=>{
    try {
        const {
            title,
            description,
            priority,
            dueDate,
            assignedTo,
            attachments,
            todoChecklist
        } = req.body;

        if (!title || !description || !priority || !dueDate) {
            return next(
                errorHandler(
                    400,
                    "Title, description, priority and due date are required"
                )
            );
        }

        if (assignedTo && !Array.isArray(assignedTo)) {
            return next(
                errorHandler(
                    400,
                    "assignedTo must be an array of user IDs"
                )
            );
        }

        await pool.query("BEGIN");

        const taskResult = await pool.query(
            `
            INSERT INTO tasks
                (
                    title,
                    description,
                    priority,
                    status,
                    duedate,
                    progress
                )
            VALUES
                ($1, $2, $3, $4, $5, $6)
            RETURNING *
            `,
            [
                title,
                description,
                priority,
                "Pending",
                dueDate,
                0
            ]
        );

        const task = taskResult.rows[0];
        
        await pool.query(
            `
            INSERT INTO task_creators
                (task_id, user_id)
            VALUES
                ($1, $2)
            `,
            [task.id, req.user.id]
        );


        if (assignedTo && assignedTo.length > 0) {

            for (const userId of assignedTo) {

                const userResult = await pool.query(
                    `
                    SELECT id
                    FROM users
                    WHERE id = $1
                    `,
                    [userId]
                );

                if (userResult.rows.length === 0) {
                    throw new Error(`User with ID ${userId} does not exist`);
                }

                await pool.query(
                    `
                    INSERT INTO task_assignees
                        (task_id, user_id)
                    VALUES
                        ($1, $2)
                    `,
                    [task.id, userId]
                );
            }
        }


        if (attachments && attachments.length > 0) {

            for (const attachment of attachments) {

                await pool.query(
                    `
                    INSERT INTO task_attachments
                        (task_id, file_url)
                    VALUES
                        ($1, $2)
                    `,
                    [task.id, attachment]
                );
            }
        }

        if (todoChecklist && todoChecklist.length > 0) {

            for (const todo of todoChecklist) {

                await pool.query(
                    `
                    INSERT INTO task_todos
                        (task_id, text, completed)
                    VALUES
                        ($1, $2, $3)
                    `,
                    [
                        task.id,
                        todo.text,
                        todo.completed || false
                    ]
                );
            }
        }

        await pool.query("COMMIT");

        res.status(201).json({
            success: true,
            message: "Task created successfully",
            task
        });

    } catch (error) {
         await pool.query("ROLLBACK");
        next(error);
    }
};

export const getTasks = async (req, res, next) => {
    try {
        const { status } = req.query;
        // 1. Get tasks
        let taskQuery;
        let taskValues;

        if (req.user.role === "admin") {

            if (status) {
                taskQuery = `
                    SELECT 
                        t.*,
                        COALESCE(
                            json_agg(
                                DISTINCT jsonb_build_object(
                                    'id', u.id,
                                    'name', u.name,
                                    'email', u.email,
                                    'profileImageUrl', u.profileimgurl
                                )
                            ) FILTER (WHERE u.id IS NOT NULL),
                            '[]'
                        ) AS assigned_to
                    FROM tasks t
                    LEFT JOIN task_assignees ta
                        ON t.id = ta.task_id
                    LEFT JOIN users u
                        ON ta.user_id = u.id
                    WHERE t.status = $1
                    GROUP BY t.id
                    ORDER BY t.id DESC
                `;

                taskValues = [status];

            } else {

                taskQuery = `
                    SELECT 
                        t.*,
                        COALESCE(
                            json_agg(
                                DISTINCT jsonb_build_object(
                                    'id', u.id,
                                    'name', u.name,
                                    'email', u.email,
                                    'profileImageUrl', u.profileimgurl
                                )
                            ) FILTER (WHERE u.id IS NOT NULL),
                            '[]'
                        ) AS assigned_to
                    FROM tasks t
                    LEFT JOIN task_assignees ta
                        ON t.id = ta.task_id
                    LEFT JOIN users u
                        ON ta.user_id = u.id
                    GROUP BY t.id
                    ORDER BY t.id DESC
                `;

                taskValues = [];
            }

        } else {

            if (status) {

                taskQuery = `
                    SELECT 
                        t.*,
                        COALESCE(
                            json_agg(
                                DISTINCT jsonb_build_object(
                                    'id', u.id,
                                    'name', u.name,
                                    'email', u.email,
                                    'profileImageUrl', u.profileimgurl
                                )
                            ) FILTER (WHERE u.id IS NOT NULL),
                            '[]'
                        ) AS assigned_to
                    FROM tasks t
                    INNER JOIN task_assignees ta
                        ON t.id = ta.task_id
                    LEFT JOIN users u
                        ON ta.user_id = u.id
                    WHERE ta.user_id = $1
                    AND t.status = $2
                    GROUP BY t.id
                    ORDER BY t.id DESC
                `;

                taskValues = [req.user.id, status];

            } else {

                taskQuery = `
                    SELECT 
                        t.*,
                        COALESCE(
                            json_agg(
                                DISTINCT jsonb_build_object(
                                    'id', u.id,
                                    'name', u.name,
                                    'email', u.email,
                                    'profileImageUrl', u.profileimgurl
                                )
                            ) FILTER (WHERE u.id IS NOT NULL),
                            '[]'
                        ) AS assigned_to
                    FROM tasks t
                    INNER JOIN task_assignees ta
                        ON t.id = ta.task_id
                    LEFT JOIN users u
                        ON ta.user_id = u.id
                    WHERE ta.user_id = $1
                    GROUP BY t.id
                    ORDER BY t.id DESC
                `;

                taskValues = [req.user.id];
            }
        }

        const taskResult = await pool.query(
            taskQuery,
            taskValues
        );

        let tasks = taskResult.rows;

        // 2. Get completed todo count

        tasks = await Promise.all(
            tasks.map(async (task) => {

                const todoResult = await pool.query(
                    `
                    SELECT COUNT(*) AS completed_count
                    FROM task_todos
                    WHERE task_id = $1
                    AND completed = true
                    `,
                    [task.id]
                );

                return {
                    ...task,
                    completedCount: Number(
                        todoResult.rows[0].completed_count
                    )
                };
            })
        );

        // 3. All tasks count

        let allTasksQuery;
        let allTasksValues;

        if (req.user.role === "admin") {

            allTasksQuery = `
                SELECT COUNT(*) AS count
                FROM tasks
            `;

            allTasksValues = [];

        } else {

            allTasksQuery = `
                SELECT COUNT(DISTINCT t.id) AS count
                FROM tasks t
                INNER JOIN task_assignees ta
                    ON t.id = ta.task_id
                WHERE ta.user_id = $1
            `;

            allTasksValues = [req.user.id];
        }

        const allTasksResult = await pool.query(
            allTasksQuery,
            allTasksValues
        );

        // 4. Pending tasks

        let pendingQuery;
        let pendingValues;

        if (req.user.role === "admin") {

            pendingQuery = `
                SELECT COUNT(*) AS count
                FROM tasks
                WHERE status = 'Pending'
            `;

            pendingValues = [];

        } else {

            pendingQuery = `
                SELECT COUNT(DISTINCT t.id) AS count
                FROM tasks t
                INNER JOIN task_assignees ta
                    ON t.id = ta.task_id
                WHERE ta.user_id = $1
                AND t.status = 'Pending'
            `;

            pendingValues = [req.user.id];
        }

        const pendingResult = await pool.query(
            pendingQuery,
            pendingValues
        );

        // 5. In Progress tasks

        let inProgressQuery;
        let inProgressValues;

        if (req.user.role === "admin") {

            inProgressQuery = `
                SELECT COUNT(*) AS count
                FROM tasks
                WHERE status = 'In Progress'
            `;

            inProgressValues = [];

        } else {

            inProgressQuery = `
                SELECT COUNT(DISTINCT t.id) AS count
                FROM tasks t
                INNER JOIN task_assignees ta
                    ON t.id = ta.task_id
                WHERE ta.user_id = $1
                AND t.status = 'In Progress'
            `;

            inProgressValues = [req.user.id];
        }

        const inProgressResult = await pool.query(
            inProgressQuery,
            inProgressValues
        );
        // 6. Completed tasks

        let completedQuery;
        let completedValues;

        if (req.user.role === "admin") {

            completedQuery = `
                SELECT COUNT(*) AS count
                FROM tasks
                WHERE status = 'Completed'
            `;

            completedValues = [];

        } else {

            completedQuery = `
                SELECT COUNT(DISTINCT t.id) AS count
                FROM tasks t
                INNER JOIN task_assignees ta
                    ON t.id = ta.task_id
                WHERE ta.user_id = $1
                AND t.status = 'Completed'
            `;

            completedValues = [req.user.id];
        }

        const completedResult = await pool.query(
            completedQuery,
            completedValues
        );

        // 7. Response

        res.status(200).json({
            tasks,

            statusSummary: {
                all: Number(
                    allTasksResult.rows[0].count
                ),

                pendingTasks: Number(
                    pendingResult.rows[0].count
                ),

                inProgressTasks: Number(
                    inProgressResult.rows[0].count
                ),

                completedTasks: Number(
                    completedResult.rows[0].count
                )
            }
        });

    } catch (error) {
        next(error);
    }
};

export const getTaskById=async(req,res,next)=>{
    try {
    const { id } = req.params;

    const taskResult = await pool.query(
        `SELECT
            t.*,

            COALESCE(
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'id', u.id,
                        'name', u.name,
                        'email', u.email,
                        'profileImageUrl', u.profileimgurl
                    )
                ) FILTER (WHERE u.id IS NOT NULL),
                '[]'
            ) AS "assignedTo"

         FROM tasks t

         LEFT JOIN task_assignees ta
            ON t.id = ta.task_id

         LEFT JOIN users u
            ON ta.user_id = u.id

         WHERE t.id = $1

         GROUP BY t.id`,
        [id]
    );

    if (taskResult.rows.length === 0) {
        return next(errorHandler(404, "Task not found!"));
    }

    res.status(200).json(taskResult.rows[0]);

} catch (error) {
    next(error);
}
};

export const updateTask=async(req,res,next)=>{
     try {
        const { id } = req.params;

        const {
            title,
            description,
            priority,
            duedate,
            todoChecklist,
            attachments,
            assignedTo
        } = req.body;


        // 1. Check if task exists

        const taskResult = await pool.query(
            `SELECT *
             FROM tasks
             WHERE id = $1`,
            [id]
        );

        if (taskResult.rows.length === 0) {
            return next(errorHandler(404, "Task not found!"));
        }


        const task = taskResult.rows[0];


        // 2. Update task

        const updatedTaskResult = await pool.query(
            `UPDATE tasks
             SET
                title = $1,
                description = $2,
                priority = $3,
                duedate = $4,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $5
             RETURNING *`,
            [
                title ?? task.title,
                description ?? task.description,
                priority ?? task.priority,
                duedate ?? task.duedate,
                id
            ]
        );


        // 3. Update assigned users

        if (assignedTo !== undefined) {

            if (!Array.isArray(assignedTo)) {
                return next(
                    errorHandler(
                        400,
                        "assignedTo must be an array of user IDs"
                    )
                );
            }


            // Remove old assignments

            await pool.query(
                `DELETE FROM task_assignees
                 WHERE task_id = $1`,
                [id]
            );


            // Add new assignments

            for (const userId of assignedTo) {

                await pool.query(
                    `INSERT INTO task_assignees
                        (task_id, user_id)
                     VALUES ($1, $2)`,
                    [id, userId]
                );
            }
        }


        // 4. Update todos

        if (todoChecklist !== undefined) {

            if (!Array.isArray(todoChecklist)) {
                return next(
                    errorHandler(
                        400,
                        "todoChecklist must be an array"
                    )
                );
            }


            // Delete old todos

            await pool.query(
                `DELETE FROM task_todos
                 WHERE task_id = $1`,
                [id]
            );


            // Insert new todos

            for (const todo of todoChecklist) {

                await pool.query(
                    `INSERT INTO task_todos
                        (task_id, text, completed)
                     VALUES ($1, $2, $3)`,
                    [
                        id,
                        todo.text,
                        todo.completed ?? false
                    ]
                );
            }
        }


        // 5. Update attachments

        if (attachments !== undefined) {

            if (!Array.isArray(attachments)) {
                return next(
                    errorHandler(
                        400,
                        "attachments must be an array"
                    )
                );
            }


            // Delete old attachments

            await pool.query(
                `DELETE FROM task_attachments
                 WHERE task_id = $1`,
                [id]
            );


            // Insert new attachments

            for (const fileUrl of attachments) {

                await pool.query(
                    `INSERT INTO task_attachments
                        (task_id, file_url)
                     VALUES ($1, $2)`,
                    [id, fileUrl]
                );
            }
        }


        // 6. Get assigned users

        const assignedUsersResult = await pool.query(
            `SELECT
                u.id,
                u.name,
                u.email,
                u.profileimgurl

             FROM task_assignees ta

             JOIN users u
                ON ta.user_id = u.id

             WHERE ta.task_id = $1`,
            [id]
        );


        // 7. Get todos

        const todosResult = await pool.query(
            `SELECT
                id,
                text,
                completed

             FROM task_todos

             WHERE task_id = $1`,
            [id]
        );


        // 8. Get attachments

        const attachmentsResult = await pool.query(
            `SELECT
                id,
                file_url

             FROM task_attachments

             WHERE task_id = $1`,
            [id]
        );


        // 9. Final response

        const updatedTask = {
            ...updatedTaskResult.rows[0],

            assignedTo: assignedUsersResult.rows,

            todoChecklist: todosResult.rows,

            attachments: attachmentsResult.rows
        };


        res.status(200).json({
            updatedTask,
            message: "Task updated successfully!"
        });

    } catch (error) {
        next(error);
    }

};

export const deleteTask=async(req,res,next)=>{
    try {
        const { id } = req.params;

        // 1. Check if task exists
        const taskResult = await pool.query(
            `SELECT id
             FROM tasks
             WHERE id = $1`,
            [id]
        );

        if (taskResult.rows.length === 0) {
            return next(errorHandler(404, "Task not found!"));
        }


        // 2. Delete assigned users
        await pool.query(
            `DELETE FROM task_assignees
             WHERE task_id = $1`,
            [id]
        );


        // 3. Delete attachments
        await pool.query(
            `DELETE FROM task_attachments
             WHERE task_id = $1`,
            [id]
        );


        // 4. Delete creator relationship
        await pool.query(
            `DELETE FROM task_creators
             WHERE task_id = $1`,
            [id]
        );


        // 5. Delete todos
        await pool.query(
            `DELETE FROM task_todos
             WHERE task_id = $1`,
            [id]
        );


        // 6. Delete the task
        await pool.query(
            `DELETE FROM tasks
             WHERE id = $1`,
            [id]
        );


        // 7. Send response
        res.status(200).json({
            message: "Task deleted successfully!"
        });

    } catch (error) {
        next(error);
    }
};