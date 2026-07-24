import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';

export const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

// Pastikan folder ada sebelum multer mencoba menulis ke sana.
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${ext}`);
  },
});

// Batas 10MB per file — sesuaikan kalau dokumen pendukung bug (video/screenshot) perlu lebih besar.
export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});
