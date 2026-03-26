import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Types } from 'mongoose';
import Scheme, { IScheme } from '../models/Scheme';
import { syncSchemesFromSource } from '../services/schemeSyncService';

const parseCsv = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

export const getSchemes = async (_req: Request, res: Response): Promise<void> => {
  try {
    const schemes = await Scheme.find({}).sort({ createdAt: -1 }).lean();
    res.status(200).json({ schemes });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch schemes' });
  }
};

export const getSchemeById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: 'Invalid scheme id' });
    return;
  }

  try {
    const scheme = await Scheme.findById(id).lean();
    if (!scheme) {
      res.status(404).json({ message: 'Scheme not found' });
      return;
    }

    res.status(200).json({ scheme });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch scheme' });
  }
};

export const filterSchemes = async (req: Request, res: Response): Promise<void> => {
  const state = String(req.query.state || '').trim();
  const category = String(req.query.category || '').trim();
  const keyword = String(req.query.keyword || '').trim();

  const filter: Record<string, unknown> = {};

  if (state) {
    filter.state = { $regex: `^${state}$`, $options: 'i' };
  }

  if (category) {
    filter.category = { $regex: `^${category}$`, $options: 'i' };
  }

  if (keyword) {
    filter.$or = [
      { name: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } },
    ];
  }

  try {
    const schemes = await Scheme.find(filter).sort({ createdAt: -1 }).lean();
    res.status(200).json({ schemes });
  } catch (error) {
    res.status(500).json({ message: 'Failed to filter schemes' });
  }
};

export const createScheme = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    return;
  }

  const payload = {
    name: String(req.body.name || '').trim(),
    state: String(req.body.state || '').trim(),
    category: String(req.body.category || '').trim(),
    description: String(req.body.description || '').trim(),
    eligibility: String(req.body.eligibility || '').trim(),
    documents: parseCsv(req.body.documents),
    benefits: String(req.body.benefits || '').trim(),
    application_link: String(req.body.application_link || '').trim(),
  };

  try {
    const scheme = await Scheme.create(payload);
    res.status(201).json({ message: 'Scheme created successfully', scheme });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create scheme' });
  }
};

export const syncSchemes = async (_req: Request, res: Response): Promise<void> => {
  try {
    const summary = await syncSchemesFromSource();

    if (!summary.sourceEnabled) {
      res.status(400).json({
        message: 'SCHEME_SYNC_SOURCE_URL is not configured. Add it in backend environment to enable auto-sync.',
      });
      return;
    }

    res.status(200).json({
      message: 'Scheme sync completed',
      summary,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to sync schemes from source' });
  }
};