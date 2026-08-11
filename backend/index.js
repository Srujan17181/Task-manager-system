import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/db.js";
import authRoutes from "./routes/auth.route.js"


dotenv.config();


pool.connect()
.then(() => console.log('PostgreSQL connected'))
.catch((err) => console.log('DB connection error:', err.message))


const app=express();
const port=3000;


// middleware to handle cors

app.use(cors({
    origin: process.env.FRONT_END_URL || "http://localhost:5173/",
    methods: ["GET","POST","PUT","DELETE"],
    allowedHeaders: ["Content-Type","Autherization"]
}))


// middleware to handle body req

app.use(express.json());

app.listen(port,()=>{
    console.log(`app run in ${port}`)
})

app.use("/api/auth",authRoutes)

app.use((err,req,res,next)=>{
    const statusCode=err.statusCode || 500;
    const message=err.message || "Internal Server Error"
    res.status(statusCode).json({
        success:false,
        statusCode,
        message,
    })
})