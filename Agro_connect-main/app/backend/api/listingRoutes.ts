import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  createListing,
  getListings,
  getMyListings,
  updateListingStatus,
} from '../controllers/listingController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get(
  '/listings',
  [
    query('category').optional().isString(),
    query('q').optional().isString(),
    query('location').optional().isString(),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('minRating').optional().isFloat({ min: 0, max: 5 }),
    query('sortBy').optional().isIn(['newest', 'priceAsc', 'priceDesc', 'ratingDesc']),
  ],
  getListings
);
router.get('/listings/me', authMiddleware, getMyListings);

router.post(
  '/listings',
  authMiddleware,
  [
    body('category').isIn(['crop', 'tool', 'land']),
    body('title').isString().trim().isLength({ min: 2, max: 160 }),
    body('location').isString().trim().isLength({ min: 2, max: 200 }),
    body('pricePerUnit').isFloat({ min: 0 }),
    body('unit').isString().trim().isLength({ min: 1, max: 30 }),
    body('description').optional().isString().isLength({ max: 2000 }),
    body('quantity').optional().isFloat({ min: 0 }),
    body('media').optional().isArray(),
    body('metadata').optional().isObject(),
  ],
  createListing
);

router.patch(
  '/listings/:listingId/status',
  authMiddleware,
  [
    param('listingId').isString().isLength({ min: 1 }),
    body('status').isIn(['active', 'inactive', 'rented', 'sold']),
  ],
  updateListingStatus
);

export default router;