import express from "express";
import { signin, signup, updateUserProfile, userProfile } from "../controller/auth.controller.js";
import { verifyToken } from "../utils/verifyToken.js";

const router =express.Router()

router.post("/sign-up",signup)

router.post("/sign-in",signin)

router.get("/user-profile",verifyToken,userProfile)

router.put("/update-user-profile",verifyToken,updateUserProfile)

export default router