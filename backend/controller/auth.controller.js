import pool from "../config/db.js"
import bcryptjs from "bcryptjs"
import { errorHandler } from "../utils/error.js"

export const signup = async(req,res,next)=> {
    try {
        
    const { name,email,password,profileImageUrl,adminJoinCode } = req.body

    if(!name || !email || !password || name==="" || email==="" || password===""){
        return next(errorHandler(400,"All feilds are required"))
    }


    // check if user already exist
    const isUserAlreadyExist=await pool.query(
        'SELECT * FROM users WHERE email=$1',[email])

    if(isUserAlreadyExist.rows[0]){
        return next(errorHandler(400,"User already Exist"))
    }

    // check for a role 

    let role='user';

    if(adminJoinCode && adminJoinCode===process.env.ADMIN_JOIN_CODE){
        role="admin"
    }

    const hashedPassword = await bcryptjs.hashSync(password,10)

    const newUser=await pool.query(
        `INSERT INTO users(name,email,password,profileimgurl,role)
        VALUES($1,$2,$3,$4,$5)
        RETURNING id,name,email,role,profileImgUrl`,
        [
            name,
            email,
            hashedPassword,
            profileImageUrl,
            role,
        ]
    )
    res.status(201).json("sign-up successfully")
    } 
    catch (error) {
        next(error.message)
        
    }

}