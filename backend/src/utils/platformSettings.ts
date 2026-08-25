import Settings, { SETTINGS_SINGLETON_ID, ISettings } from '../models/Settings.model';

/**
 * Fetches (and lazily creates) the platform settings singleton. Called at
 * the specific moments enforcement actually happens — login, registration,
 * password change, payment init — never on every authenticated request, so
 * there's no need for a cache layer here.
 */
export async function getPlatformSettings(): Promise<ISettings> {
  let settings = await Settings.findById(SETTINGS_SINGLETON_ID);
  if (!settings) {
    settings = await Settings.create({ _id: SETTINGS_SINGLETON_ID });
  }
  return settings;
}
