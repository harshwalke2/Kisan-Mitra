import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  createScheme,
  filterSchemes,
  getSchemeById,
  getSchemes,
  syncSchemes,
} from '../controllers/schemeController';

const router = Router();

router.get('/schemes', getSchemes);

router.get(
  '/schemes/filter',
  [
    query('state').optional().isString().trim().isLength({ min: 1, max: 100 }),
    query('category').optional().isString().trim().isLength({ min: 1, max: 100 }),
    query('keyword').optional().isString().trim().isLength({ min: 1, max: 150 }),
  ],
  filterSchemes
);

router.get('/schemes/:id', [param('id').isString().isLength({ min: 1 })], getSchemeById);

router.post(
  '/schemes',
  [
    body('name').isString().trim().isLength({ min: 2, max: 180 }),
    body('state').isString().trim().isLength({ min: 2, max: 100 }),
    body('category').isString().trim().isLength({ min: 2, max: 100 }),
    body('description').isString().trim().isLength({ min: 10, max: 3000 }),
    body('eligibility').isString().trim().isLength({ min: 10, max: 3000 }),
    body('documents').isArray({ min: 1 }),
    body('documents.*').isString().trim().isLength({ min: 1, max: 120 }),
    body('benefits').isString().trim().isLength({ min: 10, max: 3000 }),
    body('application_link').isString().trim().isURL(),
  ],
  createScheme
);

router.post('/schemes/sync', syncSchemes);

export default router;