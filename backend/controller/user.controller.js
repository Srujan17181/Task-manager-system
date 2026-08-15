import { response } from "express";
import pool from "../config/db.js";
import { errorHandler } from "../utils/error.js";


export const getUsers= async (req,res,next)=>{
    try {
        const users=await pool.query(`SELECT id,name,email,role FROM users WHERE role=$1 `,['user']);
        
        const myUsers=users.rows
        
        const userWithTaskCounts =await Promise.all(
            myUsers.map(async(user)=> {
                const taskResult=await pool.query(`
                    SELECT COUNT(*) FILTER(WHERE t.status='Pending') AS pending_tasks,
                    COUNT(*) FILTER(WHERE t.status='In Progress') AS in_progress_tasks,
                    COUNT(*) FILTER(WHERE t.status='Completed') AS completed_tasks
                    FROM tasks t
                    INNER JOIN task_assignees  ta
                    ON t.id=ta.task_id
                    WHERE ta.user_id=$1
                    `,[user.id])
                
                const pendingTasks=Number(taskResult.rows[0].pending_tasks);
                const inProgressTasks=Number(taskResult.rows[0].in_progress_tasks)
                const completedTasks=Number(taskResult.rows[0].completed_tasks)
                return {
                    ...user,
                    pendingTasks,
                    inProgressTasks,
                    completedTasks,
                }
            })
        )

        res.status(200).json(userWithTaskCounts)
    } catch (error) {
        next(error)
    }
}