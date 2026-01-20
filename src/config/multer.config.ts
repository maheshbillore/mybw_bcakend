import multer from "multer";
import path from "path";
import fs from "fs";

const filesUploadDir = (file: any) => {
    let uploadDir = "";
    if (file.fieldname == "subCategoriesImages") {
        uploadDir = "uploads/sub-categories";
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        return uploadDir;
    } else if (file.fieldname == "categoriesImages") {
        uploadDir = "uploads/categories";
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        return uploadDir;
    } else if (file.fieldname == "picture") {
        uploadDir = "uploads/profile";
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        return uploadDir;
    } else if (file.fieldname == "jobImages") {
        uploadDir = "uploads/job-images";
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        return uploadDir;
    } else {
        uploadDir = "uploads/partner-docs";
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        return uploadDir;
    }
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadDir = filesUploadDir(file);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(
            null,
            file.fieldname +
            "-" +
            uniqueSuffix +
            path.extname(file.originalname)
        );
    },
});

export const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => { 

        const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "application/pdf",
            "image/avif"
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    `Invalid file type: ${file.mimetype}. Only JPEG, JPG, PNG, WebP, AVIF and PDF are allowed.`
                )
            );
        }
    },
}).fields([
    { name: "picture", maxCount: 1 },
    { name: "aadharFront", maxCount: 1 },
    { name: "aadharBack", maxCount: 1 },
    { name: "panFront", maxCount: 1 },
    { name: "panBack", maxCount: 1 },
    { name: "experienceCertificates", maxCount: 5 },
    { name: "categoriesImages", maxCount: 15 },
    { name: "subCategoriesImages", maxCount: 15 },
    { name: "jobImages", maxCount: 15 },
]);



export const uploadAny = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => { 

        const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "application/pdf",
            "image/avif"
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    `Invalid file type: ${file.mimetype}. Only JPEG, JPG, PNG, WebP, AVIF and PDF are allowed.`
                )
            );
        }
    },
}).any();


export const storageSingle = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadDir = "";
        if (file.fieldname == "subCategoriesImages") {
            uploadDir = "uploads/sub-categories";
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
        } else if (file.fieldname == "services") {
            uploadDir = "uploads/servicesImage";
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
        } else if (file.fieldname == "categoryType") {
            uploadDir = "uploads/categoryType";
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
        } else if (file.fieldname == "categoryImage") {
            uploadDir = "uploads/categories";
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
        } else if (file.fieldname == "paymentImage") {
            uploadDir = "uploads/paymentImage";
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
        } else if (file.fieldname == "picture") {
            uploadDir = "uploads/profile";
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
        } else if (file.fieldname == "banner") {
            uploadDir = "uploads/banner";
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
        } else {
            uploadDir = "uploads/profile";
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + "-" + uniqueSuffix + ext);
    },
});

export const uploadSingle = multer({ storage: storageSingle });
