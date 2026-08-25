import { Response } from 'express';
import Event from '../models/Event.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/apiResponse';

export const getEvents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    const isElevated = req.user && ['admin', 'super_admin'].includes(req.user.role);
    if (!isElevated) filter.isPublished = true;
    if (req.query.upcoming === 'true') filter.startDate = { $gte: new Date() };

    const events = await Event.find(filter).sort({ startDate: 1 });
    sendSuccess(res, events, 'Events fetched.');
  } catch {
    sendError(res, 'Could not fetch events.', 500);
  }
};

export const getEventById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      sendError(res, 'Event not found.', 404);
      return;
    }
    sendSuccess(res, event, 'Event fetched.');
  } catch {
    sendError(res, 'Could not fetch event.', 500);
  }
};

export const createEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, startDate, endDate, location, isOnline, meetingUrl, thumbnail, registrationLink, isPublished } = req.body;
    if (!title || !description || !startDate || !endDate) {
      sendError(res, 'Title, description, start date, and end date are required.', 400);
      return;
    }
    const event = await Event.create({
      title, description, startDate, endDate, location, meetingUrl, thumbnail, registrationLink,
      isOnline: !!isOnline,
      isPublished: !!isPublished,
      createdBy: req.user!._id,
    });
    sendSuccess(res, event, 'Event created.', 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not create event.', 500);
  }
};

export const updateEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!event) {
      sendError(res, 'Event not found.', 404);
      return;
    }
    sendSuccess(res, event, 'Event updated.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not update event.', 500);
  }
};

export const deleteEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      sendError(res, 'Event not found.', 404);
      return;
    }
    sendSuccess(res, null, 'Event deleted.');
  } catch {
    sendError(res, 'Could not delete event.', 500);
  }
};
