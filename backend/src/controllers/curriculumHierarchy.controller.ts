import { Response } from 'express';
import BadgeLevel from '../models/BadgeLevel.model';
import Module from '../models/Module.model';
import Week from '../models/Week.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/apiResponse';

// ─── Badge Levels ───────────────────────────────────────────────────────────
export const getBadgeLevels = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.course) filter.course = req.query.course;
    const badgeLevels = await BadgeLevel.find(filter).sort({ order: 1 });
    sendSuccess(res, badgeLevels, 'Badge levels fetched.');
  } catch {
    sendError(res, 'Could not fetch badge levels.', 500);
  }
};

export const createBadgeLevel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, level, course, description, badgeIcon, order } = req.body;
    if (!title || !level || !course) {
      sendError(res, 'Title, level, and course are required.', 400);
      return;
    }
    const badgeLevel = await BadgeLevel.create({
      title, level, course, description, badgeIcon,
      order: order ?? level,
    });
    sendSuccess(res, badgeLevel, 'Badge level created.', 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not create badge level.', 500);
  }
};

export const updateBadgeLevel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const badgeLevel = await BadgeLevel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!badgeLevel) {
      sendError(res, 'Badge level not found.', 404);
      return;
    }
    sendSuccess(res, badgeLevel, 'Badge level updated.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not update badge level.', 500);
  }
};

export const deleteBadgeLevel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const badgeLevel = await BadgeLevel.findByIdAndDelete(req.params.id);
    if (!badgeLevel) {
      sendError(res, 'Badge level not found.', 404);
      return;
    }
    sendSuccess(res, null, 'Badge level deleted.');
  } catch {
    sendError(res, 'Could not delete badge level.', 500);
  }
};

// ─── Modules ────────────────────────────────────────────────────────────────
export const getModules = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.badgeLevel) filter.badgeLevel = req.query.badgeLevel;
    const modules = await Module.find(filter).sort({ order: 1 });
    sendSuccess(res, modules, 'Modules fetched.');
  } catch {
    sendError(res, 'Could not fetch modules.', 500);
  }
};

export const createModule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, badgeLevel, description, order } = req.body;
    if (!name || !badgeLevel) {
      sendError(res, 'Module name and badge level are required.', 400);
      return;
    }
    const existingCount = await Module.countDocuments({ badgeLevel });
    const module = await Module.create({ name, badgeLevel, description, order: order ?? existingCount + 1 });
    sendSuccess(res, module, 'Module created.', 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not create module.', 500);
  }
};

export const updateModule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const module = await Module.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!module) {
      sendError(res, 'Module not found.', 404);
      return;
    }
    sendSuccess(res, module, 'Module updated.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not update module.', 500);
  }
};

export const deleteModule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const module = await Module.findByIdAndDelete(req.params.id);
    if (!module) {
      sendError(res, 'Module not found.', 404);
      return;
    }
    sendSuccess(res, null, 'Module deleted.');
  } catch {
    sendError(res, 'Could not delete module.', 500);
  }
};

// ─── Weeks ──────────────────────────────────────────────────────────────────
export const getWeeks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.module) filter.module = req.query.module;
    const weeks = await Week.find(filter).sort({ weekNumber: 1 });
    sendSuccess(res, weeks, 'Weeks fetched.');
  } catch {
    sendError(res, 'Could not fetch weeks.', 500);
  }
};

export const createWeek = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, module, weekNumber, description } = req.body;
    if (!title || !module) {
      sendError(res, 'Week title and module are required.', 400);
      return;
    }
    const existingCount = await Week.countDocuments({ module });
    const week = await Week.create({ title, module, weekNumber: weekNumber ?? existingCount + 1, description });
    sendSuccess(res, week, 'Week created.', 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not create week.', 500);
  }
};

export const updateWeek = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const week = await Week.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!week) {
      sendError(res, 'Week not found.', 404);
      return;
    }
    sendSuccess(res, week, 'Week updated.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not update week.', 500);
  }
};

export const deleteWeek = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const week = await Week.findByIdAndDelete(req.params.id);
    if (!week) {
      sendError(res, 'Week not found.', 404);
      return;
    }
    sendSuccess(res, null, 'Week deleted.');
  } catch {
    sendError(res, 'Could not delete week.', 500);
  }
};
