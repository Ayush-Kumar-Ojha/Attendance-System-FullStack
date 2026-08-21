import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => ({
        folder: "company-documents",
        resource_type: "raw",
        public_id: `${req.params.type}-${Date.now()}-${file.originalname}`,
    }),
});

export const uploadDocument = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single("file");