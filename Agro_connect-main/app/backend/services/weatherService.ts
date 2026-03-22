import axios from 'axios';

export type WeatherSnapshot = {
  temperature: number;
  humidity: number;
  rainExpectedTomorrow: boolean;
  summary: string;
  source: 'openweather' | 'open-meteo' | 'fallback';
};

type OpenWeatherGeoResponse = Array<{
  lat: number;
  lon: number;
  name?: string;
}>;

type OpenWeatherForecastResponse = {
  list?: Array<{
    dt_txt?: string;
    main?: {
      temp?: number;
      humidity?: number;
    };
    weather?: Array<{ main?: string; description?: string }>;
    rain?: {
      '3h'?: number;
    };
  }>;
};

type OpenMeteoGeoResponse = {
  results?: Array<{
    latitude: number;
    longitude: number;
    name?: string;
  }>;
};

type OpenMeteoForecastResponse = {
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    relative_humidity_2m?: number[];
    precipitation_probability?: number[];
  };
};

const getOpenWeatherApiKey = (): string => String(process.env.OPENWEATHER_API_KEY || '').trim();

const withRetry = async <T>(fn: () => Promise<T>, retries = 1): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
};

const hashText = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const fallbackWeather = (location: string): WeatherSnapshot => {
  const seed = `${location.toLowerCase()}-${new Date().toISOString().slice(0, 10)}`;
  const base = hashText(seed);
  const temperature = 22 + (base % 16);
  const humidity = 50 + (base % 46);
  const rainExpectedTomorrow = base % 3 === 0 || humidity > 72;

  return {
    temperature,
    humidity,
    rainExpectedTomorrow,
    summary: rainExpectedTomorrow ? 'Rain likely tomorrow' : 'Dry weather likely tomorrow',
    source: 'fallback',
  };
};

const fetchFromOpenWeather = async (location: string, apiKey: string): Promise<WeatherSnapshot | null> => {
  const geoResponse = await axios.get<OpenWeatherGeoResponse>('https://api.openweathermap.org/geo/1.0/direct', {
    params: {
      q: location,
      limit: 1,
      appid: apiKey,
    },
    timeout: 7000,
  });

  const first = geoResponse.data?.[0];
  if (!first || !Number.isFinite(first.lat) || !Number.isFinite(first.lon)) {
    return null;
  }

  const forecast = await axios.get<OpenWeatherForecastResponse>('https://api.openweathermap.org/data/2.5/forecast', {
    params: {
      lat: first.lat,
      lon: first.lon,
      units: 'metric',
      appid: apiKey,
    },
    timeout: 7000,
  });

  const slots = forecast.data?.list || [];
  if (!slots.length) {
    return null;
  }

  const now = Date.now();
  const tomorrowWindowStart = now + 24 * 60 * 60 * 1000;
  const tomorrowWindowEnd = now + 48 * 60 * 60 * 1000;

  const tomorrowSlots = slots.filter((slot) => {
    const ts = slot.dt_txt ? Date.parse(slot.dt_txt) : Number.NaN;
    return Number.isFinite(ts) && ts >= tomorrowWindowStart && ts < tomorrowWindowEnd;
  });

  const baselineSlots = slots.slice(0, Math.min(slots.length, 4));
  const sample = baselineSlots.length ? baselineSlots : slots;

  const tempValues = sample
    .map((item) => Number(item.main?.temp))
    .filter((value) => Number.isFinite(value));

  const humidityValues = sample
    .map((item) => Number(item.main?.humidity))
    .filter((value) => Number.isFinite(value));

  const avgTemp = tempValues.length
    ? tempValues.reduce((sum, value) => sum + value, 0) / tempValues.length
    : 28;

  const avgHumidity = humidityValues.length
    ? humidityValues.reduce((sum, value) => sum + value, 0) / humidityValues.length
    : 65;

  const rainExpectedTomorrow = tomorrowSlots.some((item) => {
    const rainVolume = Number(item.rain?.['3h'] || 0);
    const weatherMain = String(item.weather?.[0]?.main || '').toLowerCase();
    return rainVolume > 0 || weatherMain.includes('rain') || weatherMain.includes('drizzle');
  });

  const summary = String(slots[0]?.weather?.[0]?.description || 'Weather update available');

  return {
    temperature: Number(avgTemp.toFixed(1)),
    humidity: Number(avgHumidity.toFixed(1)),
    rainExpectedTomorrow,
    summary,
    source: 'openweather',
  };
};

const fetchFromOpenMeteo = async (location: string): Promise<WeatherSnapshot | null> => {
  const geoResponse = await axios.get<OpenMeteoGeoResponse>('https://geocoding-api.open-meteo.com/v1/search', {
    params: {
      name: location,
      count: 1,
    },
    timeout: 7000,
  });

  const geo = geoResponse.data?.results?.[0];
  if (!geo || !Number.isFinite(geo.latitude) || !Number.isFinite(geo.longitude)) {
    return null;
  }

  const forecast = await axios.get<OpenMeteoForecastResponse>('https://api.open-meteo.com/v1/forecast', {
    params: {
      latitude: geo.latitude,
      longitude: geo.longitude,
      hourly: 'temperature_2m,relative_humidity_2m,precipitation_probability',
      forecast_days: 3,
      timezone: 'auto',
    },
    timeout: 7000,
  });

  const times = forecast.data?.hourly?.time || [];
  const temperatures = forecast.data?.hourly?.temperature_2m || [];
  const humidities = forecast.data?.hourly?.relative_humidity_2m || [];
  const precipitationProbabilities = forecast.data?.hourly?.precipitation_probability || [];

  if (!times.length || !temperatures.length || !humidities.length) {
    return null;
  }

  const now = Date.now();
  const tomorrowStart = now + 24 * 60 * 60 * 1000;
  const tomorrowEnd = now + 48 * 60 * 60 * 1000;

  const nextHoursIndexes = times
    .map((t, index) => ({ index, ts: Date.parse(t) }))
    .filter((item) => Number.isFinite(item.ts) && item.ts >= now)
    .slice(0, 6)
    .map((item) => item.index);

  const tomorrowIndexes = times
    .map((t, index) => ({ index, ts: Date.parse(t) }))
    .filter((item) => Number.isFinite(item.ts) && item.ts >= tomorrowStart && item.ts < tomorrowEnd)
    .map((item) => item.index);

  const sampleIndexes = nextHoursIndexes.length ? nextHoursIndexes : [0, 1, 2].filter((idx) => idx < times.length);

  const avgTemp =
    sampleIndexes.reduce((sum, idx) => sum + Number(temperatures[idx] || 0), 0)
    / Math.max(1, sampleIndexes.length);

  const avgHumidity =
    sampleIndexes.reduce((sum, idx) => sum + Number(humidities[idx] || 0), 0)
    / Math.max(1, sampleIndexes.length);

  const maxTomorrowRainProb = tomorrowIndexes.reduce((max, idx) => {
    const value = Number(precipitationProbabilities[idx] || 0);
    return Math.max(max, Number.isFinite(value) ? value : 0);
  }, 0);

  const rainExpectedTomorrow = maxTomorrowRainProb >= 40;

  return {
    temperature: Number(avgTemp.toFixed(1)),
    humidity: Number(avgHumidity.toFixed(1)),
    rainExpectedTomorrow,
    summary: rainExpectedTomorrow
      ? `Rain probability tomorrow around ${Math.round(maxTomorrowRainProb)}%`
      : 'Low rain probability tomorrow',
    source: 'open-meteo',
  };
};

export const getWeatherSnapshot = async (location?: string): Promise<WeatherSnapshot> => {
  const normalizedLocation = String(location || '').trim();
  if (!normalizedLocation) {
    return fallbackWeather('india');
  }

  const apiKey = getOpenWeatherApiKey();

  if (apiKey) {
    try {
      const data = await withRetry(() => fetchFromOpenWeather(normalizedLocation, apiKey), 1);
      if (data) {
        return data;
      }
    } catch (error) {
      // Continue to secondary provider.
    }
  }

  try {
    const data = await withRetry(() => fetchFromOpenMeteo(normalizedLocation), 1);
    if (data) {
      return data;
    }
  } catch (error) {
    // Fall back to deterministic weather simulation for demo continuity.
  }

  return fallbackWeather(normalizedLocation);
};
