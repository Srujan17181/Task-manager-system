import pool from "../config/db.js"
import bcryptjs from "bcryptjs"
import { errorHandler } from "../utils/error.js"
import jwt from 'jsonwebtoken'

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


export const signin = async(req,res,next)=> {
    try {
        const {email,password}=req.body

        // check for the email and password which should not be empty

        if(!email||!password||email===""||password===""){
            return next(errorHandler(400,"email and password required"))
        }

        // check for the vaildemail
        
        const vaildEmail=await pool.query(`SELECT * FROM users WHERE email=$1`,[email]);
        // got user

        const user=vaildEmail.rows[0]
        if(!user){
            return next(errorHandler(400,"User not Found"))
        }

        // compare password 
        
        const ismatch=await bcryptjs.compareSync(password,user.password);

        if(!ismatch){
            return next(errorHandler(400,"incorrect Password "))
        }

        const token=jwt.sign(
            {id:user.id},
            process.env.JWT_SECRET
        )

        const {password:pass,...rest}=user
        
        res.status(200).cookie("access_token",token,{httpOnly:true}).json(rest)
        

    } catch (error) {
        
        next(error)
    }

}

export const userProfile = async(req,res,next)=>{
    try {
        
        const validUser=await pool.query(`SELECT * FROM users WHERE id=$1`,[req.user.id])

        const user=validUser.rows[0]
        if(!user){
            return next(errorHandler(404,"User Not Found"))
        }

        const {password:pass,...rest}=user

        res.status(200).json(rest)

    } catch (error) {
        next(error)
    }
}

export const updateUserProfile=async (req,res,next)=>{
    try {
        const user=await pool.query(`SELECT * FROM users WHERE id=$1`,[req.user.id])
        const currentUser=user.rows[0]
        if(!currentUser){
            return next(errorHandler(404,"User Not Found"))
        }

        currentUser.name=req.body.name ||  currentUser.name
        currentUser.email=req.body.email || currentUser.email

        if(req.body.password){
            currentUser.password=bcryptjs.hashSync(req.body.password,10);
        }
        
        const{password:pass,...rest}=currentUser

        res.status(200).json(rest)
    } catch (error) {
        next(error)
    }
   
    
}