import pool from "../config/db.js"
import excelJs from "exceljs"

export const exportTaskReport=async(req,res,next)=>{
     try {

        // 1. Get tasks with assigned users
        const result = await pool.query(
            `SELECT
                t.id,
                t.title,
                t.description,
                t.priority,
                t.status,
                t.duedate,
                u.name,
                u.email

             FROM tasks t

             LEFT JOIN task_assignees ta
                ON t.id = ta.task_id

             LEFT JOIN users u
                ON ta.user_id = u.id

             ORDER BY t.created_at DESC`
        );


        // 2. Create workbook
        const workbook = new excelJs.Workbook();

        const worksheet =
            workbook.addWorksheet("Tasks Report");


        // 3. Define columns
        worksheet.columns = [
            {
                header: "Task Id",
                key: "id",
                width: 15
            },
            {
                header: "Title",
                key: "title",
                width: 30
            },
            {
                header: "Description",
                key: "description",
                width: 50
            },
            {
                header: "Priority",
                key: "priority",
                width: 15
            },
            {
                header: "Status",
                key: "status",
                width: 20
            },
            {
                header: "Due Date",
                key: "duedate",
                width: 20
            },
            {
                header: "Assigned To",
                key: "assignedTo",
                width: 30
            }
        ];


        // 4. Group tasks
        const taskMap = new Map();

        result.rows.forEach((row) => {

            if (!taskMap.has(row.id)) {

                taskMap.set(row.id, {
                    id: row.id,
                    title: row.title,
                    description: row.description,
                    priority: row.priority,
                    status: row.status,
                    duedate: row.duedate,
                    assignedTo: []
                });

            }


            // Add assigned user
            if (row.name) {

                taskMap.get(row.id).assignedTo.push(
                    `${row.name} (${row.email})`
                );

            }
        });


        // 5. Add tasks to Excel
        taskMap.forEach((task) => {

            worksheet.addRow({
                id: task.id,

                title: task.title,

                description: task.description,

                priority: task.priority,

                status: task.status,

                duedate: task.duedate
                    ? new Date(task.duedate)
                        .toISOString()
                        .split("T")[0]
                    : "",

                assignedTo:
                    task.assignedTo.length > 0
                        ? task.assignedTo.join(", ")
                        : "Unassigned"
            });

        });


        // 6. Set response headers
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            'attachment; filename="tasks_report.xlsx"'
        );


        // 7. Send Excel file
        await workbook.xlsx.write(res);

        res.end();

    } catch (error) {
        next(error);
    }

};

export const exportUsersReport = async (req, res, next) => {
    try {

        // 1. Get users and their task counts
        const result = await pool.query(
            `SELECT
                u.id,
                u.name,
                u.email,

                COUNT(ta.task_id) AS task_count,

                COUNT(ta.task_id)
                    FILTER (
                        WHERE t.status = 'Pending'
                    ) AS pending_tasks,

                COUNT(ta.task_id)
                    FILTER (
                        WHERE t.status = 'In Progress'
                    ) AS in_progress_tasks,

                COUNT(ta.task_id)
                    FILTER (
                        WHERE t.status = 'Completed'
                    ) AS completed_tasks

             FROM users u

             LEFT JOIN task_assignees ta
                ON u.id = ta.user_id

             LEFT JOIN tasks t
                ON ta.task_id = t.id

             GROUP BY u.id, u.name, u.email

             ORDER BY u.name`
        );


        // 2. Create workbook
        const workbook = new excelJs.Workbook();

        const worksheet =
            workbook.addWorksheet("User Task Report");


        // 3. Define columns
        worksheet.columns = [
            {
                header: "User Name",
                key: "name",
                width: 30
            },
            {
                header: "Email",
                key: "email",
                width: 40
            },
            {
                header: "Total Assigned Tasks",
                key: "taskCount",
                width: 20
            },
            {
                header: "Pending Tasks",
                key: "pendingTasks",
                width: 20
            },
            {
                header: "In Progress Tasks",
                key: "inProgressTasks",
                width: 20
            },
            {
                header: "Completed Tasks",
                key: "completedTasks",
                width: 20
            }
        ];


        // 4. Add users to Excel
        result.rows.forEach((user) => {

            worksheet.addRow({
                name: user.name,

                email: user.email,

                taskCount: Number(user.task_count),

                pendingTasks: Number(user.pending_tasks),

                inProgressTasks: Number(
                    user.in_progress_tasks
                ),

                completedTasks: Number(
                    user.completed_tasks
                )
            });

        });


        // 5. Set response headers
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            'attachment; filename="users_report.xlsx"'
        );


        // 6. Send Excel file
        await workbook.xlsx.write(res);

        res.end();

    } catch (error) {
        next(error);
    }
};