import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fail } from '../utils/apiResponse.js';

const uploadDir = process.env.UPLOAD_DIR || './uploads';

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage engine configuration: in-memory storage for forwarding to Supabase Storage
const storage = multer.memoryStorage();

// Allowed MIME types: images and PDF only
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf'
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(`Unsupported file type: ${file.mimetype}. Allowed types: JPEG, PNG, WEBP, PDF.`);
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB maximum file size
  }
});

/**
 * Middleware helper for uploading a single file with error handling wrapper
 * @param {string} fieldName - Form field name
 */
export const uploadSingle = (fieldName) => {
  const single = upload.single(fieldName);
  return (req, res, next) => {
    single(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return fail(res, 'File size exceeds the 10MB limit.', 400);
        }
        if (err.code === 'INVALID_FILE_TYPE') {
          return fail(res, err.message, 400);
        }
        return fail(res, err.message || 'Error uploading file.', 400);
      }
      next();
    });
  };
};

/**
 * Middleware helper for uploading multiple files with error handling wrapper
 * @param {string} fieldName - Form field name
 * @param {number} [maxCount=5] - Maximum number of files
 */
export const uploadMultiple = (fieldName, maxCount = 5) => {
  const arrayUpload = upload.array(fieldName, maxCount);
  return (req, res, next) => {
    arrayUpload(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return fail(res, 'One or more files exceed the 10MB size limit.', 400);
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return fail(res, `Exceeded maximum file count limit of ${maxCount}.`, 400);
        }
        if (err.code === 'INVALID_FILE_TYPE') {
          return fail(res, err.message, 400);
        }
        return fail(res, err.message || 'Error uploading files.', 400);
      }
      next();
    });
  };
};

/**
 * Middleware helper for uploading multiple named fields
 * @param {Array<{ name: string, maxCount?: number }>} fields
 */
export const uploadFields = (fields) => {
  const fieldsUpload = upload.fields(fields);
  return (req, res, next) => {
    fieldsUpload(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return fail(res, 'One or more files exceed the 10MB size limit.', 400);
        }
        if (err.code === 'INVALID_FILE_TYPE') {
          return fail(res, err.message, 400);
        }
        return fail(res, err.message || 'Error uploading files.', 400);
      }
      next();
    });
  };
};

export default { uploadSingle, uploadMultiple, uploadFields };
