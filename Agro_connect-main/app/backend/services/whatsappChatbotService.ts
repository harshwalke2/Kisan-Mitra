import axios from 'axios';
import Scheme from '../models/Scheme';
import { CropRecommendationInput } from '../models/cropRecommendationModel';
import { getMarketSignal } from './marketService';
import { predictCropWithPython } from '../utils/pythonCropPredictor';

type BotLanguage = 'en' | 'mr';

type BotStep =
  | 'idle'
  | 'awaiting_location'
  | 'awaiting_disease_image'
  | 'awaiting_scheme_state'
  | 'awaiting_market_crop'
  | 'awaiting_season_crop';

type UserSession = {
  step: BotStep;
  language: BotLanguage;
  updatedAt: number;
};

type IncomingWhatsappPayload = {
  from: string;
  body: string;
  mediaUrl?: string;
  numMedia: number;
};

type FastApiPredictResponse = {
  best_crop: string;
  confidence: number;
};

type DiseasePrediction = {
  disease: string;
  confidence: number;
  pesticide: string;
  prevention: string;
  fertilizer: string;
};

const userState: Record<string, UserSession> = {};

const DEFAULT_LANGUAGE: BotLanguage =
  String(process.env.WHATSAPP_BOT_DEFAULT_LANG || 'en').toLowerCase() === 'mr' ? 'mr' : 'en';

const normalize = (value: unknown): string => String(value || '').trim().toLowerCase();

const titleCase = (value: string): string =>
  value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

const toPercent = (raw: unknown): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  const normalizedValue = parsed <= 1 ? parsed * 100 : parsed;
  return Math.max(0, Math.min(100, Number(normalizedValue.toFixed(1))));
};

const t = (lang: BotLanguage, english: string, marathi: string): string =>
  lang === 'mr' ? marathi : english;

const getSession = (phone: string): UserSession => {
  if (!userState[phone]) {
    userState[phone] = {
      step: 'idle',
      language: DEFAULT_LANGUAGE,
      updatedAt: Date.now(),
    };
  }

  return userState[phone];
};

const updateSession = (phone: string, updates: Partial<UserSession>): UserSession => {
  const current = getSession(phone);
  const merged: UserSession = {
    ...current,
    ...updates,
    updatedAt: Date.now(),
  };

  userState[phone] = merged;
  return merged;
};

const isMenuTrigger = (text: string): boolean => {
  const value = normalize(text);
  return (
    value === 'hi'
    || value === 'hello'
    || value === 'menu'
    || value === 'start'
    || value === 'restart'
    || value === 'नमस्कार'
    || value === 'मेनू'
    || value === 'मेणू'
  );
};

const maybeSwitchLanguage = (phone: string, text: string): BotLanguage | null => {
  const value = normalize(text);

  if (value === 'mr' || value === 'marathi' || value === 'मराठी') {
    updateSession(phone, { language: 'mr' });
    return 'mr';
  }

  if (value === 'en' || value === 'english' || value === 'इंग्रजी') {
    updateSession(phone, { language: 'en' });
    return 'en';
  }

  return null;
};

const getMainMenu = (lang: BotLanguage): string => {
  const english = [
    '🌾 KISAN MITRA',
    '',
    'Choose what you need:',
    '1️⃣ Recommend',
    '2️⃣ Disease',
    '3️⃣ Scheme',
    '4️⃣ Market',
    '5️⃣ Season',
    '',
    'Language: type mr for Marathi, en for English',
  ];

  const marathi = [
    '🌾 किसान मित्र',
    '',
    'तुम्हाला काय हवे आहे ते निवडा:',
    '1️⃣ पीक शिफारस',
    '2️⃣ रोग तपासणी',
    '3️⃣ सरकारी योजना',
    '4️⃣ बाजार माहिती',
    '5️⃣ हंगाम सल्ला',
    '',
    'Language: मराठीसाठी mr, English साठी en टाइप करा',
  ];

  return (lang === 'mr' ? marathi : english).join('\n');
};

const getHelpText = (lang: BotLanguage): string => {
  const english = [
    '❓ Invalid input.',
    'Please choose from menu options.',
    '',
    'Type menu to restart',
  ];

  const marathi = [
    '❓ चुकीचा इनपुट.',
    'कृपया मेनूतील पर्याय निवडा.',
    '',
    'पुन्हा सुरू करण्यासाठी menu टाइप करा',
  ];

  return (lang === 'mr' ? marathi : english).join('\n');
};

const parseLocation = (raw: string): { state: string; district: string } | null => {
  const value = String(raw || '').trim();
  if (!value) {
    return null;
  }

  const separator = value.includes('|') ? '|' : value.includes(',') ? ',' : '';
  if (!separator) {
    return null;
  }

  const [stateRaw, districtRaw] = value
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!stateRaw || !districtRaw) {
    return null;
  }

  return {
    state: titleCase(stateRaw),
    district: titleCase(districtRaw),
  };
};

const hashText = (value: string): number => {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
};

const locationToInput = (state: string, district: string): CropRecommendationInput => {
  const key = `${normalize(state)}-${normalize(district)}`;
  const seed = hashText(key);

  return {
    nitrogen: 60 + (seed % 45),
    phosphorus: 30 + (seed % 35),
    potassium: 25 + (seed % 35),
    temperature: 18 + (seed % 16),
    humidity: 55 + (seed % 35),
    ph: Number((5.5 + ((seed % 20) / 10)).toFixed(1)),
    rainfall: 80 + (seed % 220),
  };
};

const fetchCropRecommendationByLocation = async (
  state: string,
  district: string
): Promise<{ crop: string; confidence: number }> => {
  const modelInput = locationToInput(state, district);

  const fastApiUrl = String(process.env.CROP_RECO_API_URL || '').trim().replace(/\/+$/, '');
  if (fastApiUrl) {
    try {
      const payload = {
        N: modelInput.nitrogen,
        P: modelInput.phosphorus,
        K: modelInput.potassium,
        temperature: modelInput.temperature,
        humidity: modelInput.humidity,
        ph: modelInput.ph,
        rainfall: modelInput.rainfall,
        budget: 0,
      };

      const response = await axios.post<FastApiPredictResponse>(`${fastApiUrl}/predict`, payload, {
        timeout: 12000,
      });

      return {
        crop: String(response.data.best_crop || 'Rice'),
        confidence: toPercent(response.data.confidence),
      };
    } catch (error) {
      // Fall back to local python model for resilience.
    }
  }

  const localPrediction = await predictCropWithPython(modelInput);
  return {
    crop: String(localPrediction.recommended_crop || 'Rice'),
    confidence: toPercent(localPrediction.confidence),
  };
};

const fetchTopSchemesByState = async (state: string): Promise<Array<{ name: string; benefit: string }>> => {
  const matchState = String(state || '').trim();

  const schemes = await Scheme.find({ state: { $regex: `^${matchState}$`, $options: 'i' } })
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();

  const fallbackSchemes = schemes.length
    ? schemes
    : await Scheme.find({}).sort({ createdAt: -1 }).limit(3).lean();

  return fallbackSchemes.map((scheme) => ({
    name: String(scheme.name || 'Unknown scheme'),
    benefit: String(scheme.benefits || scheme.description || 'Benefit information not available'),
  }));
};

const pickString = (obj: Record<string, unknown>, keys: string[], fallback: string): string => {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return fallback;
};

const detectDiseaseFromImage = async (mediaUrl: string): Promise<DiseasePrediction> => {
  const sid = String(process.env.TWILIO_ACCOUNT_SID || '').trim();
  const token = String(process.env.TWILIO_AUTH_TOKEN || '').trim();

  const mediaResponse = await fetch(mediaUrl, {
    headers:
      sid && token
        ? {
            Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
          }
        : undefined,
  });

  if (!mediaResponse.ok) {
    throw new Error(`Failed to download media: ${mediaResponse.status}`);
  }

  const mimeType = mediaResponse.headers.get('content-type') || 'image/jpeg';
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const imageBuffer = await mediaResponse.arrayBuffer();

  const formData = new FormData();
  formData.append('file', new Blob([imageBuffer], { type: mimeType }), `leaf.${ext}`);

  const modelUrl = String(process.env.DISEASE_ML_API_URL || 'http://localhost:5000/predict').trim();
  const predictionResponse = await fetch(modelUrl, {
    method: 'POST',
    body: formData,
  });

  if (!predictionResponse.ok) {
    throw new Error(`Disease model request failed: ${predictionResponse.status}`);
  }

  const predictionPayload = (await predictionResponse.json()) as Record<string, unknown>;

  return {
    disease: pickString(predictionPayload, ['disease', 'class_name', 'prediction', 'label'], 'Unknown disease'),
    confidence: toPercent(predictionPayload.confidence ?? predictionPayload.probability),
    pesticide: pickString(
      predictionPayload,
      ['pesticide', 'recommended_pesticide', 'treatment'],
      'Consult local agriculture officer'
    ),
    prevention: pickString(
      predictionPayload,
      ['prevention', 'preventive_measures', 'precaution'],
      'Remove infected leaves and keep field sanitation'
    ),
    fertilizer: pickString(
      predictionPayload,
      ['fertilizer', 'recommended_fertilizer', 'nutrient_advice'],
      'Balanced NPK as per soil test'
    ),
  };
};

const seasonAdviceForCrop = (cropName: string): { season: string; tip: string } => {
  const crop = normalize(cropName);

  if (crop.includes('rice') || crop.includes('paddy')) {
    return {
      season: 'Kharif',
      tip: 'Transplant before heavy rain and maintain standing water management.',
    };
  }

  if (crop.includes('wheat')) {
    return {
      season: 'Rabi',
      tip: 'Best sowing window is Nov-Dec with timely first irrigation.',
    };
  }

  if (crop.includes('cotton')) {
    return {
      season: 'Kharif',
      tip: 'Use pest monitoring traps and avoid excess nitrogen.',
    };
  }

  return {
    season: 'Kharif',
    tip: 'Use certified seeds and align sowing with local rainfall forecast.',
  };
};

const containsAny = (text: string, words: string[]): boolean => words.some((word) => text.includes(word));

const isRecommendChoice = (text: string): boolean => {
  const value = normalize(text);
  return value === '1' || containsAny(value, ['recommend', 'crop', 'पीक', 'शिफारस']);
};

const isDiseaseChoice = (text: string): boolean => {
  const value = normalize(text);
  return value === '2' || containsAny(value, ['disease', 'रोग']);
};

const isSchemeChoice = (text: string): boolean => {
  const value = normalize(text);
  return value === '3' || containsAny(value, ['scheme', 'yojana', 'योजना']);
};

const isMarketChoice = (text: string): boolean => {
  const value = normalize(text);
  return value === '4' || containsAny(value, ['market', 'bajar', 'बाजार']);
};

const isSeasonChoice = (text: string): boolean => {
  const value = normalize(text);
  return value === '5' || containsAny(value, ['season', 'हंगाम']);
};

export const handleIncomingWhatsappMessage = async (payload: IncomingWhatsappPayload): Promise<string> => {
  const from = String(payload.from || '').trim() || 'unknown';
  const text = String(payload.body || '').trim();
  const mediaUrl = String(payload.mediaUrl || '').trim();

  const languageSwitch = maybeSwitchLanguage(from, text);
  if (languageSwitch) {
    return t(
      languageSwitch,
      '✅ Language switched to English.\n\nType menu to restart.',
      '✅ भाषा मराठी सेट केली.\n\nपुन्हा सुरू करण्यासाठी menu टाइप करा.'
    );
  }

  const session = getSession(from);

  if (isMenuTrigger(text)) {
    updateSession(from, { step: 'idle' });
    return getMainMenu(session.language);
  }

  if (session.step === 'awaiting_location') {
    const location = parseLocation(text);

    if (!location) {
      return t(
        session.language,
        'Invalid format. Send location like: State | District\nExample: Maharashtra | Pune\n\nType menu to restart.',
        'फॉरमॅट चुकीचा आहे. असे पाठवा: राज्य | जिल्हा\nउदा: Maharashtra | Pune\n\nपुन्हा सुरू करण्यासाठी menu टाइप करा.'
      );
    }

    try {
      const recommendation = await fetchCropRecommendationByLocation(location.state, location.district);
      updateSession(from, { step: 'idle' });

      return [
        `📍 Location: ${location.state}, ${location.district}`,
        `🌾 Recommended Crop: ${recommendation.crop}`,
        `✅ Confidence: ${recommendation.confidence}%`,
        '',
        t(session.language, 'Type menu to restart', 'पुन्हा सुरू करण्यासाठी menu टाइप करा'),
      ].join('\n');
    } catch (error) {
      return t(
        session.language,
        'Could not fetch recommendation right now. Please try again.\n\nType menu to restart.',
        'सध्या पीक शिफारस मिळत नाही. कृपया पुन्हा प्रयत्न करा.\n\nपुन्हा सुरू करण्यासाठी menu टाइप करा.'
      );
    }
  }

  if (session.step === 'awaiting_disease_image') {
    if (!mediaUrl || payload.numMedia < 1) {
      return t(
        session.language,
        'Please send a crop/leaf image for disease detection.\n\nType menu to restart.',
        'रोग तपासणीसाठी कृपया पिकाचा/पानाचा फोटो पाठवा.\n\nपुन्हा सुरू करण्यासाठी menu टाइप करा.'
      );
    }

    try {
      const prediction = await detectDiseaseFromImage(mediaUrl);
      updateSession(from, { step: 'idle' });

      const lines = [
        `🦠 Disease: ${prediction.disease}`,
        `📊 Confidence: ${prediction.confidence}%`,
        '',
        `💊 Pesticide: ${prediction.pesticide}`,
        `🌿 Prevention: ${prediction.prevention}`,
        `🌱 Fertilizer: ${prediction.fertilizer}`,
      ];

      if (prediction.confidence < 70) {
        lines.push('');
        lines.push(
          t(
            session.language,
            '⚠️ Low confidence. Please upload a clearer image.',
            '⚠️ खात्री कमी आहे. कृपया अधिक स्पष्ट फोटो अपलोड करा.'
          )
        );
      }

      lines.push('');
      lines.push(t(session.language, 'Type menu to restart', 'पुन्हा सुरू करण्यासाठी menu टाइप करा'));

      return lines.join('\n');
    } catch (error) {
      return t(
        session.language,
        'Disease model is unavailable right now. Please try again later.\n\nType menu to restart.',
        'सध्या रोग मॉडेल उपलब्ध नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.\n\nपुन्हा सुरू करण्यासाठी menu टाइप करा.'
      );
    }
  }

  if (session.step === 'awaiting_scheme_state') {
    const state = titleCase(text);

    if (!state) {
      return t(
        session.language,
        'Please send your state name.\n\nType menu to restart.',
        'कृपया राज्याचे नाव पाठवा.\n\nपुन्हा सुरू करण्यासाठी menu टाइप करा.'
      );
    }

    try {
      const schemes = await fetchTopSchemesByState(state);
      updateSession(from, { step: 'idle' });

      if (!schemes.length) {
        return t(
          session.language,
          'No schemes found for this state right now.\n\nType menu to restart.',
          'या राज्यासाठी सध्या योजना सापडल्या नाहीत.\n\nपुन्हा सुरू करण्यासाठी menu टाइप करा.'
        );
      }

      const lines = [
        `🏛️ Top Schemes for ${state}:`,
        '',
      ];

      schemes.forEach((scheme, index) => {
        lines.push(`${index + 1}. ${scheme.name}`);
        lines.push(`   ✅ Benefit: ${scheme.benefit}`);
        lines.push('');
      });

      lines.push(t(session.language, 'Type menu to restart', 'पुन्हा सुरू करण्यासाठी menu टाइप करा'));
      return lines.join('\n');
    } catch (error) {
      return t(
        session.language,
        'Could not fetch schemes right now.\n\nType menu to restart.',
        'सध्या योजना मिळत नाहीत.\n\nपुन्हा सुरू करण्यासाठी menu टाइप करा.'
      );
    }
  }

  if (session.step === 'awaiting_market_crop') {
    const cropName = titleCase(text || 'Wheat');
    const signal = getMarketSignal(cropName.toLowerCase());
    updateSession(from, { step: 'idle' });

    const trendLabel = signal.trend === 'up' ? 'Up' : signal.trend === 'down' ? 'Down' : 'Stable';

    return [
      `📈 Market Update`,
      `🌾 Crop: ${cropName}`,
      `📊 Trend: ${trendLabel}`,
      `💹 Change: ${signal.changePercent}%`,
      '',
      t(session.language, 'Type menu to restart', 'पुन्हा सुरू करण्यासाठी menu टाइप करा'),
    ].join('\n');
  }

  if (session.step === 'awaiting_season_crop') {
    const cropName = titleCase(text || 'Rice');
    const advice = seasonAdviceForCrop(cropName);
    updateSession(from, { step: 'idle' });

    return [
      '🗓️ Season Advice',
      `🌾 Crop: ${cropName}`,
      `✅ Best Season: ${advice.season}`,
      `💡 Tip: ${advice.tip}`,
      '',
      t(session.language, 'Type menu to restart', 'पुन्हा सुरू करण्यासाठी menu टाइप करा'),
    ].join('\n');
  }

  if (isRecommendChoice(text)) {
    updateSession(from, { step: 'awaiting_location' });
    return t(
      session.language,
      'Send location in this format:\nState | District\nExample: Maharashtra | Pune',
      'स्थान या फॉरमॅटमध्ये पाठवा:\nराज्य | जिल्हा\nउदा: Maharashtra | Pune'
    );
  }

  if (isDiseaseChoice(text)) {
    updateSession(from, { step: 'awaiting_disease_image' });
    return t(
      session.language,
      'Please send a crop/leaf image for disease detection.',
      'रोग तपासणीसाठी कृपया पिकाचा/पानाचा फोटो पाठवा.'
    );
  }

  if (isSchemeChoice(text)) {
    updateSession(from, { step: 'awaiting_scheme_state' });
    return t(
      session.language,
      'Please send your state name.\nExample: Maharashtra',
      'कृपया राज्याचे नाव पाठवा.\nउदा: Maharashtra'
    );
  }

  if (isMarketChoice(text)) {
    updateSession(from, { step: 'awaiting_market_crop' });
    return t(
      session.language,
      'Please send crop name for market update.\nExample: Tomato',
      'बाजार माहितीसाठी पिकाचे नाव पाठवा.\nउदा: Tomato'
    );
  }

  if (isSeasonChoice(text)) {
    updateSession(from, { step: 'awaiting_season_crop' });
    return t(
      session.language,
      'Please send crop name for season advice.\nExample: Wheat',
      'हंगाम सल्ल्यासाठी पिकाचे नाव पाठवा.\nउदा: Wheat'
    );
  }

  return `${getHelpText(session.language)}\n\n${getMainMenu(session.language)}`;
};
