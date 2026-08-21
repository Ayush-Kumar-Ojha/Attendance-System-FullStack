import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
    cloudinary,
    params: () => ({
        folder: "wall-posts",
        allowed_formats: ["jpg", "jpeg", "png"],
    }),
});

export const uploadPostImages = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
}).array("images", 5);