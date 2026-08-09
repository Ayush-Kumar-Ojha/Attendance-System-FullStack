import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = "uploads";
const photoDir = path.join(uploadDir, "photos");
const cvDir = path.join(uploadDir, "cvs");

// Ensure upload folders exist
[uploadDir, photoDir, cvDir].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === "photo") cb(null, photoDir);
        else if (file.fieldname === "cv") cb(null, cvDir);
        else cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${req.session.userId}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueSuffix);
    },
});

export const uploadProfileFiles = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
}).fields([
    { name: "photo", maxCount: 1 },
    { name: "cv", maxCount: 1 },
]);