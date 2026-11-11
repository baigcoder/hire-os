import multer from "multer";

const storage = multer.memoryStorage();

// Bounded and type-filtered before the buffer is kept in memory. This uploader also
// serves anonymous routes (register), so an unbounded body could exhaust the process.
const ALLOWED_MIME = /^(image\/(png|jpe?g|webp|gif)|application\/pdf)$/;

export const singleUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 40, fieldSize: 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    ALLOWED_MIME.test(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Unsupported file type. Use PNG, JPG, WebP, GIF or PDF.")),
}).single("file");
