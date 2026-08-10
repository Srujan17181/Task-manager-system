import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

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