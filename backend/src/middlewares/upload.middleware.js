const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          "niahair/appointments",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "heic"],
    transformation:  [{ width: 1200, height: 1200, crop: "limit", quality: "auto" }],
  },
});

const upload = multer({
  storage,
  limits:     { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipe file tidak diizinkan: ${file.mimetype}. Hanya JPG, PNG, WEBP, HEIC.`));
    }
  },
});

module.exports = upload;
