import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();


const db=new pg.Client({
    user:process.env.DB_USER,
    host:process.env.DB_HOST,
    port:process.env.DB_PORT,
    database:process.env.DB_NAME,
    password:process.env.DB_PASSWORD
});


db.connect();


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

db.query("SELECT NOW()",(err,res)=>{
    if(err){
        console.error("database is connected failure",err.message)
    }
    else{
        console.log("database is connected");
        console.log("server time",res.rows[0]);
    }

});


app.listen(port,()=>{
    console.log(`app run in ${port}`)
})