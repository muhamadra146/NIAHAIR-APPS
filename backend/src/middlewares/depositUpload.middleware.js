const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          "niahair/deposits",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "heic"],
    transformation:  [{ width: 1200, height: 1200, crop: "limit", quality: "auto" }],
  },
});

const uploadDeposit = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

module.exports = uploadDeposit;
