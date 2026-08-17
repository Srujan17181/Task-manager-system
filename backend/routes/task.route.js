import express from 'express'
import { adminOnly, verifyToken } from '../utils/verifyToken.js';
import { createTask, getTaskById, getTasks, updateTask } from '../controller/task.controller.js';



const router=express.Router();

router.post('/create',verifyToken,adminOnly,createTask)

router.get('/',verifyToken,getTasks)

router.get('/:id',verifyToken,getTaskById)

router.put('/:id',verifyToken,updateTask)

export default router