import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => {
        if (file.fieldname === "photo") {
            return {
                folder: "employee-photos",
                allowed_formats: ["jpg", "jpeg", "png"],
                public_id: `${req.session.userId}-${Date.now()}`,
            };
        } else if (file.fieldname === "cv") {
            return {
                folder: "employee-cvs",
                resource_type: "raw", // needed for non-image files like PDFs/docs
                public_id: `${req.session.userId}-${Date.now()}-${file.originalname}`,
            };
        }
        return { folder: "misc" };
    },
});

export const uploadProfileFiles = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
}).fields([
    { name: "photo", maxCount: 1 },
    { name: "cv", maxCount: 1 },
]);