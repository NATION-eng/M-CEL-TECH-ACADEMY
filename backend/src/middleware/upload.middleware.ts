import multer from 'multer';
import { Request } from 'express';

// Documents/images/archives — smaller, tighter limit is appropriate.
const DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // legacy .doc
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // legacy .xls
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-powerpoint', // legacy .ppt
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'application/zip',
  'application/x-zip-compressed',
]);

// Video/audio — genuinely large files need a much higher ceiling.
const MEDIA_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
]);

const DOCUMENT_MAX_SIZE = 15 * 1024 * 1024; // 15MB
const MEDIA_MAX_SIZE = 500 * 1024 * 1024; // 500MB

const storage = multer.memoryStorage();

const makeFilter = (allowed: Set<string>, label: string) => (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  if (allowed.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed for ${label} upload: ${file.mimetype}.`));
  }
};

const documentUpload = multer({
  storage,
  fileFilter: makeFilter(DOCUMENT_MIME_TYPES, 'document'),
  limits: { fileSize: DOCUMENT_MAX_SIZE },
});

const mediaUpload = multer({
  storage,
  fileFilter: makeFilter(MEDIA_MIME_TYPES, 'video/audio'),
  limits: { fileSize: MEDIA_MAX_SIZE },
});

// Documents, images, spreadsheets, presentations, zips — profile pictures,
// assignment submissions, course resources.
export const uploadSingle = documentUpload.single('file');
export const uploadMultiple = documentUpload.array('files', 5);

// Video/audio course resources — separate limits since a 15MB cap makes
// video uploads unusable, but a 500MB cap on a profile picture is reckless.
export const uploadMediaSingle = mediaUpload.single('file');
