import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

type GovRecord = Record<string, unknown>;

export type LiveMarketInsight = {
  id: string;
  title: string;
  description: string;
  category: string;
  impact: 'high' | 'medium' | 'low';
  createdAt: string;
};

type DataGovResponse = {
  title?: string;
  records?: GovRecord[];
};

type ParsedObservation = {
  commodity: string;
  location: string;
  price: number;
  date: Date;
};

const DEFAULT_BASE_URL = 'https://api.data.gov.in/resource';
const CACHE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_LOCAL_MANDI_CSV = path.resolve(
  process.cwd(),
  '..',
  '..',
  'data',
  'mandi',
  '9ef84268-d588-465a-a308-a864a43d0070.csv'
);

let cacheExpiry = 0;
let cachedInsights: LiveMarketInsight[] = [];
let cachedSource = 'data.gov.in';

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/,/g, '').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const toDate = (value: unknown): Date | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const yearDate = new Date(Date.UTC(value, 0, 1));
    return Number.isNaN(yearDate.getTime()) ? null : yearDate;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  const dmyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    const parsedDmy = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(parsedDmy.getTime()) ? null : parsedDmy;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeKeys = (record: GovRecord): GovRecord => {
  const normalized: GovRecord = {};
  for (const [key, value] of Object.entries(record)) {
    const cleanedKey = key
      .toLowerCase()
      .replace(/_x0020_/g, '_')
      .replace(/\s+/g, '_')
      .replace(/__+/g, '_')
      .trim();
    normalized[cleanedKey] = value;
  }
  return normalized;
};

const parseCsvLine = (line: string): string[] => {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  fields.push(current);
  return fields.map((field) => field.trim());
};

const parseLocalMandiCsv = async (csvPath: string): Promise<GovRecord[]> => {
  const raw = await fs.readFile(csvPath, 'utf8');
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  const records: GovRecord[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const row = parseCsvLine(lines[i]);
    const record: GovRecord = {};

    headers.forEach((header, idx) => {
      record[header] = row[idx] ?? '';
    });

    records.push(record);
  }

  return records;
};

const pickFirstString = (record: GovRecord, keys: string[]): string => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

const pickFirstNumber = (record: GovRecord, keys: string[]): number | null => {
  for (const key of keys) {
    const value = toNumber(record[key]);
    if (value !== null) {
      return value;
    }
  }
  return null;
};

const pickFirstDate = (record: GovRecord, keys: string[]): Date | null => {
  for (const key of keys) {
    const value = toDate(record[key]);
    if (value) {
      return value;
    }
  }
  return null;
};

const getImpact = (percentageDelta: number): 'high' | 'medium' | 'low' => {
  const absolute = Math.abs(percentageDelta);
  if (absolute >= 12) {
    return 'high';
  }
  if (absolute >= 5) {
    return 'medium';
  }
  return 'low';
};

const parseObservation = (record: GovRecord): ParsedObservation | null => {
  const normalizedRecord = normalizeKeys(record);

  const commodity = pickFirstString(record, [
    'commodity',
    'crop',
    'crop_name',
    'item',
    'variety',
  ]);
  const commodityNormalized = pickFirstString(normalizedRecord, [
    'commodity',
    'crop',
    'crop_name',
    'item',
    'variety',
  ]);

  const state = pickFirstString(record, ['state', 'state_name'])
    || pickFirstString(normalizedRecord, ['state', 'state_name']);
  const district = pickFirstString(record, ['district', 'district_name'])
    || pickFirstString(normalizedRecord, ['district', 'district_name']);
  const market = pickFirstString(record, ['market', 'mandi', 'market_name'])
    || pickFirstString(normalizedRecord, ['market', 'mandi', 'market_name']);
  const location = [market, district, state].filter(Boolean).join(', ') || state || 'India';

  const price = pickFirstNumber(record, [
    'modal_price',
    'price',
    'average_price',
    'avg_price',
    'max_price',
    'min_price',
  ]) ?? pickFirstNumber(normalizedRecord, [
    'modal_price',
    'price',
    'average_price',
    'avg_price',
    'max_price',
    'min_price',
  ]);

  const date = pickFirstDate(record, [
    'arrival_date',
    'date',
    'reported_date',
    'timestamp',
    'month',
    'year',
  ]) ?? pickFirstDate(normalizedRecord, [
    'arrival_date',
    'date',
    'reported_date',
    'timestamp',
    'month',
    'year',
  ]);

  const finalCommodity = commodity || commodityNormalized;

  if (!finalCommodity || price === null || !date) {
    return null;
  }

  return {
    commodity: finalCommodity,
    location,
    price,
    date,
  };
};

const loadApiRecords = async (limit: number): Promise<{ records: GovRecord[]; source: string }> => {
  const resourceId = process.env.DATA_GOV_RESOURCE_ID;
  const apiKey = process.env.DATA_GOV_API_KEY;

  if (!resourceId || !apiKey) {
    throw new Error('Data.gov credentials missing');
  }

  const baseUrl = process.env.DATA_GOV_BASE_URL || DEFAULT_BASE_URL;
  const endpoint = `${baseUrl.replace(/\/$/, '')}/${resourceId}`;

  const response = await axios.get<DataGovResponse>(endpoint, {
    params: {
      'api-key': apiKey,
      format: 'json',
      limit,
    },
    timeout: 15000,
  });

  return {
    records: Array.isArray(response.data?.records) ? response.data.records : [],
    source: response.data?.title?.trim() || 'data.gov.in',
  };
};

const loadLocalCsvRecords = async (): Promise<{ records: GovRecord[]; source: string }> => {
  const csvPath = process.env.DATA_GOV_LOCAL_CSV_PATH || DEFAULT_LOCAL_MANDI_CSV;
  const records = await parseLocalMandiCsv(csvPath);
  return {
    records,
    source: `Local mandi dataset (${path.basename(csvPath)})`,
  };
};

const buildInsights = (observations: ParsedObservation[]): LiveMarketInsight[] => {
  const grouped = new Map<string, ParsedObservation[]>();

  for (const item of observations) {
    const key = `${item.commodity}::${item.location}`;
    const existing = grouped.get(key) || [];
    existing.push(item);
    grouped.set(key, existing);
  }

  const insights: LiveMarketInsight[] = [];

  for (const [key, items] of grouped.entries()) {
    const [commodity, location] = key.split('::');
    const sorted = [...items].sort((a, b) => b.date.getTime() - a.date.getTime());
    const latest = sorted[0];
    const previous = sorted[1];

    if (!latest) {
      continue;
    }

    if (previous && previous.price > 0) {
      const delta = latest.price - previous.price;
      const pct = (delta / previous.price) * 100;
      const direction = delta >= 0 ? 'rose' : 'fell';

      insights.push({
        id: `${commodity}-${location}-${latest.date.getTime()}`,
        title: `${commodity} prices ${direction} in ${location}`,
        description: `Latest price is Rs ${latest.price.toFixed(2)} (previous Rs ${previous.price.toFixed(2)}, change ${pct.toFixed(1)}%).`,
        category: 'Government Market Data',
        impact: getImpact(pct),
        createdAt: latest.date.toISOString(),
      });
      continue;
    }

    insights.push({
      id: `${commodity}-${location}-${latest.date.getTime()}-snapshot`,
      title: `Latest ${commodity} price in ${location}`,
      description: `Reported price is Rs ${latest.price.toFixed(2)} based on the most recent government record.`,
      category: 'Government Market Data',
      impact: 'low',
      createdAt: latest.date.toISOString(),
    });
  }

  return insights
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 12);
};

export const fetchGovMarketInsights = async (limit = 500): Promise<{
  insights: LiveMarketInsight[];
  source: string;
}> => {
  if (Date.now() < cacheExpiry && cachedInsights.length > 0) {
    return {
      insights: cachedInsights,
      source: cachedSource,
    };
  }

  let loaded: { records: GovRecord[]; source: string };

  try {
    loaded = await loadApiRecords(limit);
  } catch (_error) {
    loaded = await loadLocalCsvRecords();
  }

  const observations = loaded.records
    .map((record) => parseObservation(record))
    .filter((record): record is ParsedObservation => Boolean(record));

  const insights = buildInsights(observations);
  const sourceTitle = loaded.source;

  cachedInsights = insights;
  cachedSource = sourceTitle;
  cacheExpiry = Date.now() + CACHE_TTL_MS;

  return {
    insights,
    source: sourceTitle,
  };
};
