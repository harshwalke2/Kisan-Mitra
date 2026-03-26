import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import Scheme from '../models/Scheme';

type ExternalScheme = {
  name?: unknown;
  state?: unknown;
  category?: unknown;
  description?: unknown;
  eligibility?: unknown;
  documents?: unknown;
  benefits?: unknown;
  application_link?: unknown;
};

type SourceMode = 'json_url' | 'data_gov';

type SyncSummary = {
  sourceEnabled: boolean;
  sourceMode?: SourceMode;
  sourceUrl?: string;
  totalFetched: number;
  inserted: number;
  skipped: number;
  errors: number;
};

const toText = (value: unknown, fallback = ''): string => String(value ?? fallback).trim();

const toDocuments = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/,|;|\||\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const pickFirstValue = (row: Record<string, unknown>, candidates: string[]): unknown => {
  for (const candidate of candidates) {
    if (Object.prototype.hasOwnProperty.call(row, candidate) && row[candidate] != null) {
      return row[candidate];
    }
  }
  return undefined;
};

const normalizeScheme = (raw: ExternalScheme) => {
  const normalized = {
    name: toText(raw.name),
    state: toText(raw.state, 'All India'),
    category: toText(raw.category, 'General'),
    description: toText(raw.description),
    eligibility: toText(raw.eligibility, 'Check official portal for current eligibility criteria.'),
    documents: toDocuments(raw.documents),
    benefits: toText(raw.benefits, 'Refer to official portal for updated benefit details.'),
    application_link: toText(raw.application_link),
  };

  if (!normalized.documents.length) {
    normalized.documents = ['Aadhaar Card', 'Bank Account Details'];
  }

  return normalized;
};

const isValidScheme = (scheme: ReturnType<typeof normalizeScheme>): boolean => {
  return Boolean(
    scheme.name
    && scheme.state
    && scheme.category
    && scheme.description
    && /^https?:\/\//i.test(scheme.application_link)
  );
};

const mapDataGovRecordToScheme = (row: Record<string, unknown>): ExternalScheme => {
  const schemeName = pickFirstValue(row, ['scheme_name', 'name', 'title', 'scheme', 'yojana_name']);
  const state = pickFirstValue(row, ['state', 'state_name', 'region']);
  const category = pickFirstValue(row, ['category', 'scheme_category', 'theme']);
  const description = pickFirstValue(row, ['description', 'brief', 'about', 'details']);
  const eligibility = pickFirstValue(row, ['eligibility', 'eligibility_criteria', 'criteria']);
  const documents = pickFirstValue(row, ['documents', 'required_documents', 'docs']);
  const benefits = pickFirstValue(row, ['benefits', 'benefit', 'scheme_benefits']);
  const applicationLink = pickFirstValue(row, ['application_link', 'apply_link', 'url', 'official_link', 'website']);

  return {
    name: schemeName,
    state,
    category,
    description,
    eligibility,
    documents,
    benefits,
    application_link: applicationLink,
  };
};

const fetchSchemesFromJsonUrl = async (sourceUrl: string): Promise<ExternalScheme[]> => {
  const isHttp = /^https?:\/\//i.test(sourceUrl);

  let payload: any;
  if (isHttp) {
    const response = await axios.get(sourceUrl, { timeout: 20000 });
    payload = response.data;
  } else {
    const absolutePath = path.isAbsolute(sourceUrl)
      ? sourceUrl
      : path.resolve(process.cwd(), sourceUrl);
    const content = await fs.readFile(absolutePath, 'utf-8');
    payload = JSON.parse(content);
  }

  if (Array.isArray(payload)) {
    return payload as ExternalScheme[];
  }

  if (Array.isArray(payload?.schemes)) {
    return payload.schemes as ExternalScheme[];
  }

  return [];
};

const fetchSchemesFromDataGov = async (): Promise<{ rows: ExternalScheme[]; sourceUrl: string }> => {
  const apiKey = String(process.env.SCHEME_SYNC_DATA_GOV_API_KEY || process.env.DATA_GOV_API_KEY || '').trim();
  const resourceId = String(process.env.SCHEME_SYNC_DATA_GOV_RESOURCE_ID || process.env.DATA_GOV_RESOURCE_ID || '').trim();
  const baseUrl = String(process.env.SCHEME_SYNC_DATA_GOV_BASE_URL || process.env.DATA_GOV_BASE_URL || 'https://api.data.gov.in/resource').trim().replace(/\/+$/, '');
  const limit = Math.max(1, Math.min(5000, Number(process.env.SCHEME_SYNC_DATA_GOV_LIMIT || 1000)));

  if (!apiKey || !resourceId) {
    return { rows: [], sourceUrl: '' };
  }

  const sourceUrl = `${baseUrl}/${encodeURIComponent(resourceId)}?api-key=${encodeURIComponent(apiKey)}&format=json&limit=${limit}`;
  const response = await axios.get(sourceUrl, { timeout: 20000 });
  const records = Array.isArray(response.data?.records) ? response.data.records : [];
  const mapped = records.map((record: Record<string, unknown>) => mapDataGovRecordToScheme(record));

  return { rows: mapped, sourceUrl };
};

const resolveSyncMode = (): SourceMode => {
  const configuredMode = String(process.env.SCHEME_SYNC_MODE || '').trim().toLowerCase();
  if (configuredMode === 'data_gov') {
    return 'data_gov';
  }

  const hasJsonUrl = Boolean(String(process.env.SCHEME_SYNC_SOURCE_URL || '').trim());
  return hasJsonUrl ? 'json_url' : 'data_gov';
};

export const syncSchemesFromSource = async (): Promise<SyncSummary> => {
  const mode = resolveSyncMode();

  let externalSchemes: ExternalScheme[] = [];
  let sourceUrl = '';

  if (mode === 'json_url') {
    sourceUrl = String(process.env.SCHEME_SYNC_SOURCE_URL || '').trim();
    if (!sourceUrl) {
      return {
        sourceEnabled: false,
        sourceMode: mode,
        totalFetched: 0,
        inserted: 0,
        skipped: 0,
        errors: 0,
      };
    }
    externalSchemes = await fetchSchemesFromJsonUrl(sourceUrl);
  } else {
    const dataGovResult = await fetchSchemesFromDataGov();
    sourceUrl = dataGovResult.sourceUrl;
    externalSchemes = dataGovResult.rows;
    if (!sourceUrl) {
      return {
        sourceEnabled: false,
        sourceMode: mode,
        totalFetched: 0,
        inserted: 0,
        skipped: 0,
        errors: 0,
      };
    }
  }

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const raw of externalSchemes) {
    try {
      const normalized = normalizeScheme(raw);

      if (!isValidScheme(normalized)) {
        skipped += 1;
        continue;
      }

      const upsertResult = await Scheme.updateOne(
        { name: normalized.name, state: normalized.state },
        { $setOnInsert: normalized },
        { upsert: true }
      );

      if (upsertResult.upsertedCount > 0) {
        inserted += 1;
      } else {
        skipped += 1;
      }
    } catch (error) {
      errors += 1;
    }
  }

  return {
    sourceEnabled: true,
    sourceMode: mode,
    sourceUrl,
    totalFetched: externalSchemes.length,
    inserted,
    skipped,
    errors,
  };
};