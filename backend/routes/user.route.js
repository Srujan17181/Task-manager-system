import express from "express"
import { adminOnly, verifyToken } from "../utils/verifyToken.js"
import { getUsers } from "../controller/user.controller.js"

const router=express.Router()


router.get("/get-user",verifyToken,adminOnly,getUsers)


export default router