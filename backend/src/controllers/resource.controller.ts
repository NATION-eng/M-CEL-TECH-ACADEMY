import { Response } from 'express';
import axios from 'axios';
import Resource from '../models/Resource.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../config/cloudinary';

export const getResources = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    const { course, week, lesson, type, search } = req.query;
    if (course) filter.course = course;
    if (week) filter.week = week;
    if (lesson) filter.lesson = lesson;
    if (type) filter.type = type;
    if (search) filter.title = { $regex: search as string, $options: 'i' };

    const resources = await Resource.find(filter).sort({ createdAt: -1 });
    sendSuccess(res, resources, 'Resources fetched.');
  } catch {
    sendError(res, 'Could not fetch resources.', 500);
  }
};

const cloudinaryResourceType = (mimetype: string): 'image' | 'video' | 'raw' => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/') || mimetype.startsWith('audio/')) return 'video'; // Cloudinary treats audio as 'video' resource type
  return 'raw';
};

const inferTypeFromMime = (mimetype: string): string => {
  if (mimetype === 'application/pdf') return 'pdf';
  if (mimetype.includes('wordprocessingml') || mimetype === 'application/msword') return 'word';
  if (mimetype.includes('spreadsheetml') || mimetype === 'application/vnd.ms-excel') return 'excel';
  if (mimetype.includes('presentationml') || mimetype === 'application/vnd.ms-powerpoint') return 'powerpoint';
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.includes('zip')) return 'zip';
  return 'other';
};

export const createResource = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const file = req.file;
    const { title, description, type, lesson, course, week, isPublic } = req.body;

    if (!title) {
      sendError(res, 'Resource title is required.', 400);
      return;
    }
    if (!file) {
      sendError(res, 'No file uploaded.', 400);
      return;
    }

    // Guard against re-uploading the exact same file twice under the same
    // title/course by checking for a resource with matching title+course+size
    // — a cheap, effective duplicate check without hashing every byte.
    if (course) {
      const dup = await Resource.findOne({ course, title, fileSize: file.size });
      if (dup) {
        sendError(res, 'A resource with this title and file already exists for this course.', 409);
        return;
      }
    }

    const resourceType = cloudinaryResourceType(file.mimetype);
    const { url, publicId } = await uploadBufferToCloudinary(file.buffer, 'resources', resourceType);

    const resource = await Resource.create({
      title,
      description,
      type: type || inferTypeFromMime(file.mimetype),
      url,
      publicId,
      fileSize: file.size,
      lesson: lesson || undefined,
      course: course || undefined,
      week: week || undefined,
      isPublic: isPublic === 'true' || isPublic === true,
      uploadedBy: req.user!._id,
    });

    sendSuccess(res, resource, 'Resource uploaded.', 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not upload resource.', 500);
  }
};

const YOUTUBE_ID_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

/**
 * Attaches a YouTube video as a resource without storing any file of our own.
 * Uses YouTube's public oEmbed endpoint (no API key required) to pull the
 * real title/thumbnail so the preview card shown to students isn't stale or
 * hand-typed — matches what's actually on YouTube.
 */
export const createYoutubeResource = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { url, description, lesson, course, week, isPublic } = req.body;
    if (!url) {
      sendError(res, 'A YouTube URL is required.', 400);
      return;
    }

    const match = url.match(YOUTUBE_ID_REGEX);
    if (!match) {
      sendError(res, 'That does not look like a valid YouTube URL.', 400);
      return;
    }
    const videoId = match[1];

    let title = 'YouTube Video';
    let thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    try {
      const oembed = await axios.get('https://www.youtube.com/oembed', {
        params: { url: `https://www.youtube.com/watch?v=${videoId}`, format: 'json' },
        timeout: 5000,
      });
      title = oembed.data.title ?? title;
      thumbnail = oembed.data.thumbnail_url ?? thumbnail;
    } catch {
      // oEmbed can fail for unlisted/region-locked videos — fall back to the
      // predictable thumbnail URL pattern rather than blocking the upload.
    }

    const resource = await Resource.create({
      title,
      description,
      type: 'youtube',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      youtubeVideoId: videoId,
      youtubeThumbnail: thumbnail,
      lesson: lesson || undefined,
      course: course || undefined,
      week: week || undefined,
      isPublic: isPublic === 'true' || isPublic === true,
      uploadedBy: req.user!._id,
    });

    sendSuccess(res, resource, 'YouTube resource added.', 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not add YouTube resource.', 500);
  }
};

/**
 * Uploads a single image and returns just its URL — used by the rich-text
 * editor's "insert image" button (blog posts, announcements), not tied to a
 * course/week/lesson the way a course Resource is.
 */
export const uploadInlineImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      sendError(res, 'No image uploaded.', 400);
      return;
    }
    if (!file.mimetype.startsWith('image/')) {
      sendError(res, 'Only image files are allowed here.', 400);
      return;
    }
    const { url } = await uploadBufferToCloudinary(file.buffer, 'inline-images', 'image');
    sendSuccess(res, { url }, 'Image uploaded.', 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not upload image.', 500);
  }
};

export const downloadResource = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloadCount: 1 } },
      { new: true }
    );
    if (!resource) {
      sendError(res, 'Resource not found.', 404);
      return;
    }
    sendSuccess(res, { url: resource.url }, 'Download link ready.');
  } catch {
    sendError(res, 'Could not process download.', 500);
  }
};

export const deleteResource = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const resource = await Resource.findByIdAndDelete(req.params.id);
    if (!resource) {
      sendError(res, 'Resource not found.', 404);
      return;
    }
    // Clean up the actual file in Cloudinary too — otherwise storage
    // silently accumulates orphaned files every time a resource is removed.
    if (resource.publicId) {
      deleteFromCloudinary(resource.publicId).catch(() => {});
    }
    sendSuccess(res, null, 'Resource deleted.');
  } catch {
    sendError(res, 'Could not delete resource.', 500);
  }
};
