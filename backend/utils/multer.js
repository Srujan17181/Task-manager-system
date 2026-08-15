import multer from 'multer'

// configure storage

const storage=multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,"uploads/")
    },
    filename:(req,file,cb)=>{
        cb(null,`${Date.now()}-${file.originalname}`)
    }
})

// file filter

const fileFilter =(req,file,cb)=>{
    const allowedTypes=["image/png","image/jpeg","image/jpg"]

    if(allowedTypes.includes(file.mimetype)){
        cb(null,true)
    }
    else{
        cb(new Error("only! jpg jpeg or png format file are allowed ",false))
    }
}

const upload=multer({storage,fileFilter})


export default upload