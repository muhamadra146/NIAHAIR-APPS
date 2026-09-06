const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const ALLOWED_EMPLOYEE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    const isPdf = file.mimetype === "application/pdf";
    return {
      folder:          "niahair/employees",
      allowed_formats: ["jpg", "jpeg", "png", "webp", "heic", "pdf"],
      resource_type:   isPdf ? "raw" : "image",
      ...(isPdf ? {} : { transformation: [{ width: 1600, height: 1600, crop: "limit", quality: "auto" }] }),
    };
  },
});

const uploadEmployee = multer({
  storage,
  limits:     { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_EMPLOYEE_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipe file tidak diizinkan: ${file.mimetype}. Hanya JPG, PNG, WEBP, HEIC, PDF.`));
    }
  },
});

module.exports = uploadEmployee;
