import { Response } from 'express';
import Settings, { SETTINGS_SINGLETON_ID } from '../models/Settings.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/apiResponse';

const getOrCreateSettings = async () => {
  let settings = await Settings.findById(SETTINGS_SINGLETON_ID);
  if (!settings) {
    settings = await Settings.create({ _id: SETTINGS_SINGLETON_ID });
  }
  return settings;
};

/** Payment-provider toggles only — safe to expose to any logged-in user so the checkout UI can react to them. Everything else in Settings is a Super Admin concern. */
export const getPublicSettings = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const settings = await getOrCreateSettings();
    sendSuccess(res, {
      payment: {
        paystackEnabled: settings.payment.paystackEnabled,
        flutterwaveEnabled: settings.payment.flutterwaveEnabled,
        allowInstallments: settings.payment.allowInstallments,
      },
    }, 'Public settings fetched.');
  } catch {
    sendError(res, 'Could not fetch settings.', 500);
  }
};

export const getSettings = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const settings = await getOrCreateSettings();
    sendSuccess(res, settings, 'Settings fetched.');
  } catch {
    sendError(res, 'Could not fetch settings.', 500);
  }
};

/**
 * Updates one section of settings at a time (matches the frontend's per-card
 * "Save" buttons). Body shape: { section: 'general'|'payment'|'notifications'|'security', ...sectionFields }
 */
export const updateSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { section, ...fields } = req.body;
    const validSections = ['general', 'payment', 'notifications', 'security'];
    if (!section || !validSections.includes(section)) {
      sendError(res, `Section must be one of: ${validSections.join(', ')}.`, 400);
      return;
    }

    // Only accept the payload matching the section being saved — e.g. a 'general'
    // save should only touch req.body.general, not payment/notif/security too.
    const sectionData = fields[section === 'notifications' ? 'notif' : section];
    if (!sectionData || typeof sectionData !== 'object') {
      sendError(res, `Missing "${section}" data in request body.`, 400);
      return;
    }

    const settings = await getOrCreateSettings();
    (settings as unknown as Record<string, unknown>)[section] = {
      ...(settings as unknown as Record<string, Record<string, unknown>>)[section],
      ...sectionData,
    };
    settings.updatedBy = req.user!._id;
    await settings.save();

    sendSuccess(res, settings, 'Settings saved.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not save settings.', 500);
  }
};
