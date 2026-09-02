import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const fileName = file.originalname.toLowerCase();

    if (
        fileName.endsWith(".xlsx") ||
        fileName.endsWith(".xls")
    ) {
        return cb(null, true);
    }

    return cb(
        new Error(
            "Only Excel files (.xlsx or .xls) are allowed"
        )
    );
};

export const uploadEmployeeExcel = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
}).single("file");