const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
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
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = uploadEmployee;
