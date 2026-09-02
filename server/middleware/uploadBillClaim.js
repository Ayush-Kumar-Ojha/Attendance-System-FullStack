import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import path from "path";
import fs from "fs";

let storage;

// Check if Cloudinary environment variables are configured
const isCloudinaryConfigured =
    Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
    Boolean(process.env.CLOUDINARY_API_KEY) &&
    Boolean(process.env.CLOUDINARY_API_SECRET);

if (isCloudinaryConfigured) {
    storage = new CloudinaryStorage({
        cloudinary,
        params: {
            folder: "bill-claims",
            allowed_formats: ["jpg", "jpeg", "png", "webp"],
        },
    });
} else {
    // Fallback to local disk storage if Cloudinary is unconfigured
    const uploadsDir = path.join(process.cwd(), "uploads", "bill-claims");
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadsDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            const ext = path.extname(file.originalname);
            cb(null, file.fieldname + "-" + uniqueSuffix + ext);
        },
    });
}

const multerUpload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (allowedTypes.includes(file.mimetype.toLowerCase())) {
            cb(null, true);
        } else {
            cb(new Error("Only JPG, PNG and WEBP image formats are allowed"));
        }
    },
}).single("bill");

// Wrapper middleware to catch upload errors gracefully
export const uploadBillClaim = (req, res, next) => {
    multerUpload(req, res, (err) => {
        if (err) {
            console.error("Upload Bill Claim Middleware Error:", err);
            return res.status(400).json({
                error: err.message || "Failed to upload bill image. Please check file size and format.",
            });
        }
        next();
    });
};