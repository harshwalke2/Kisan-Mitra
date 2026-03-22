import { Types } from 'mongoose';
import Notification from '../models/Notification';
import User from '../models/User';
import { createAndEmitNotification } from './notificationService';
import { getWeatherSnapshot } from './weatherService';
import { evaluatePestRisk } from './pestService';
import { getMarketSignal } from './marketService';

type GenerateOptions = {
  location?: string;
  crop?: string;
  temperature?: number;
  humidity?: number;
  rainExpected?: boolean;
  marketChangePercent?: number;
  force?: boolean;
};

type GenerateResult = {
  created: number;
  skipped: number;
  notifications: Array<{ id: string; title: string; message: string }>;
};

const KNOWN_CROPS = [
  'rice',
  'wheat',
  'maize',
  'tomato',
  'potato',
  'cotton',
  'onion',
  'soybean',
  'sugarcane',
  'bajra',
  'millet',
];

const extractCrop = (farmName?: string, override?: string): string => {
  const fromOverride = String(override || '').trim().toLowerCase();
  if (fromOverride) {
    return fromOverride;
  }

  const fromFarm = String(farmName || '').toLowerCase();
  const matched = KNOWN_CROPS.find((crop) => fromFarm.includes(crop));
  return matched || 'tomato';
};

const buildDedupeKey = (type: 'weather' | 'pest' | 'market' | 'smart', fingerprint: string): string => {
  const today = new Date().toISOString().slice(0, 10);
  return `${today}:${type}:${fingerprint.toLowerCase().replace(/\s+/g, '-')}`;
};

const notificationExists = async (userId: string, dedupeKey: string): Promise<boolean> => {
  const existing = await Notification.findOne({
    recipientId: new Types.ObjectId(userId),
    dedupeKey,
  })
    .select('_id')
    .lean();

  return Boolean(existing);
};

const maybeCreate = async (
  userId: string,
  payload: {
    title: string;
    message: string;
    category: 'farm' | 'market' | 'system';
    type: 'info' | 'warning' | 'success' | 'alert';
    alertType: 'weather' | 'pest' | 'market' | 'smart';
    dedupeKey: string;
  },
  force = false
): Promise<{ created: boolean; id?: string; title: string; message: string }> => {
  if (!force) {
    const exists = await notificationExists(userId, payload.dedupeKey);
    if (exists) {
      return { created: false, title: payload.title, message: payload.message };
    }
  }

  const created = await createAndEmitNotification({
    recipientId: userId,
    title: payload.title,
    message: payload.message,
    category: payload.category,
    type: payload.type,
    alertType: payload.alertType,
    dedupeKey: payload.dedupeKey,
  });

  return {
    created: Boolean(created),
    id: created?._id ? String(created._id) : undefined,
    title: payload.title,
    message: payload.message,
  };
};

export const generateSmartNotificationsForUser = async (
  userId: string,
  options: GenerateOptions = {}
): Promise<GenerateResult> => {
  const user = await User.findById(userId)
    .select('_id location farmName preferredLanguage')
    .lean();

  if (!user || !user._id) {
    return { created: 0, skipped: 0, notifications: [] };
  }

  const location = String(options.location || user.location || 'India').trim();
  const crop = extractCrop(user.farmName, options.crop);

  const weather = await getWeatherSnapshot(location);
  const humidity = Number.isFinite(options.humidity) ? Number(options.humidity) : weather.humidity;
  const temperature = Number.isFinite(options.temperature)
    ? Number(options.temperature)
    : weather.temperature;
  const rainExpectedTomorrow =
    typeof options.rainExpected === 'boolean' ? options.rainExpected : weather.rainExpectedTomorrow;

  const pestRisk = evaluatePestRisk({ humidity, temperature });
  const marketSignal = getMarketSignal(crop, options.marketChangePercent);

  const candidates: Array<{
    title: string;
    message: string;
    category: 'farm' | 'market' | 'system';
    type: 'info' | 'warning' | 'success' | 'alert';
    alertType: 'weather' | 'pest' | 'market' | 'smart';
    dedupeKey: string;
  }> = [];

  if (rainExpectedTomorrow) {
    candidates.push({
      title: 'Rain Warning Alert',
      message: 'Rain expected tomorrow. Avoid irrigation.',
      category: 'farm',
      type: 'warning',
      alertType: 'weather',
      dedupeKey: buildDedupeKey('weather', `${location}-rain`),
    });
  }

  if (pestRisk.shouldNotify) {
    candidates.push({
      title: 'Pest Risk Alert',
      message: 'High risk of pest attack. Take preventive measures.',
      category: 'farm',
      type: 'alert',
      alertType: 'pest',
      dedupeKey: buildDedupeKey('pest', `${location}-${Math.round(humidity)}-${Math.round(temperature)}`),
    });
  }

  if (marketSignal.shouldNotify) {
    const directionWord = marketSignal.changePercent > 0 ? 'increased' : 'dropped';
    candidates.push({
      title: 'Market Price Alert',
      message: `${crop.charAt(0).toUpperCase() + crop.slice(1)} prices ${directionWord} by ${Math.abs(
        marketSignal.changePercent
      ).toFixed(1)}% today.`,
      category: 'market',
      type: marketSignal.changePercent > 0 ? 'success' : 'warning',
      alertType: 'market',
      dedupeKey: buildDedupeKey('market', `${crop}-${marketSignal.changePercent.toFixed(1)}`),
    });
  }

  if (crop === 'rice' && rainExpectedTomorrow) {
    candidates.push({
      title: 'Smart Cultivation Insight',
      message: 'Good condition for rice cultivation. Plan sowing and nutrient application accordingly.',
      category: 'farm',
      type: 'success',
      alertType: 'smart',
      dedupeKey: buildDedupeKey('smart', `${crop}-rain-match`),
    });
  }

  if (!rainExpectedTomorrow && temperature >= 32) {
    candidates.push({
      title: 'Smart Irrigation Alert',
      message: 'No rain and high temperature detected. Irrigation required to reduce crop stress.',
      category: 'farm',
      type: 'warning',
      alertType: 'smart',
      dedupeKey: buildDedupeKey('smart', `${crop}-dry-hot`),
    });
  }

  let created = 0;
  let skipped = 0;
  const notifications: Array<{ id: string; title: string; message: string }> = [];

  for (const candidate of candidates) {
    const result = await maybeCreate(userId, candidate, Boolean(options.force));
    if (result.created && result.id) {
      created += 1;
      notifications.push({ id: result.id, title: result.title, message: result.message });
    } else {
      skipped += 1;
    }
  }

  return { created, skipped, notifications };
};

export const generateSmartNotificationsForAllUsers = async (): Promise<{
  usersProcessed: number;
  notificationsCreated: number;
}> => {
  const users = await User.find({ role: 'farmer' }).select('_id').lean();

  let notificationsCreated = 0;

  for (const user of users) {
    const userId = user?._id ? String(user._id) : '';
    if (!Types.ObjectId.isValid(userId)) {
      continue;
    }

    const result = await generateSmartNotificationsForUser(userId);
    notificationsCreated += result.created;
  }

  return {
    usersProcessed: users.length,
    notificationsCreated,
  };
};
