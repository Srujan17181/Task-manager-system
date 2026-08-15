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

