const multer = require("multer");

const storage = multer.memoryStorage();

const imageFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/png",
    "image/jpg",
    "image/jpeg",
    "image/gif",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only .png, .jpg, .jpeg and .gif formats are allowed"), false);
  }
};

const pdfFileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["application/pdf"];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only .pdf formats are allowed"), false);
  }
};

const videoFileFilter = (req, file, cb) => {
  const allowedVideoTypes = [
    "image/png",
    "image/jpg",
    "image/jpeg",
    "video/mp4",
    "video/mkv",
    "video/x-matroska",
    "video/webm",
    "video/quicktime",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  if (allowedVideoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Only .mp4, .mkv, .webm, and .mov video formats are allowed"),
      false
    );
  }
};

const uploadImage = multer({
  storage: storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 1024 * 1024 * 10, // 10 MB
  },
});

const uploadVideo = multer({
  storage: storage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: 1024 * 1024 * 15, // 15 MB
  },
});

const uploadPdf = multer({
  storage: storage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5, // 5 MB
  },
});

const uploadMagazinePdf = multer({
  storage: storage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: 1024 * 1024 * 20, // 20 MB
  },
});

module.exports = {
  uploadImage,
  uploadVideo,
  uploadPdf,
  uploadMagazinePdf,
};
