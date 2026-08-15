import express from 'express'
import { adminOnly, verifyToken } from '../utils/verifyToken.js';
import { createTask, getTasks } from '../controller/task.controller.js';



const router=express.Router();

router.post('/create',verifyToken,adminOnly,createTask)

router.get('/',verifyToken,getTasks)


export default router