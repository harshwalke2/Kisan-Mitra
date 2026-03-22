import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  createListing,
  deleteProduct,
  getProductById,
  getListings,
  getMyListings,
  updateProduct,
  updateListingStatus,
  uploadProductImage,
} from '../controllers/listingController';
import { authMiddleware } from '../middleware/auth';
import { uploadProductImageMiddleware } from '../middleware/upload';

const router = Router();

const categoryValidation = body('category').isIn([
  'crop',
  'tool',
  'land',
  'vegetable',
  'fruit',
  'grain',
  'pulse',
  'spice',
  'other',
]);

const createProductValidation = [
  categoryValidation,
  body('productName').optional().isString().trim().isLength({ min: 2, max: 160 }),
  body('title').optional().isString().trim().isLength({ min: 2, max: 160 }),
  body('location').isString().trim().isLength({ min: 2, max: 200 }),
  body('price').optional().isFloat({ min: 0 }),
  body('pricePerUnit').optional().isFloat({ min: 0 }),
  body('unit').isString().trim().isLength({ min: 1, max: 30 }),
  body('description').optional().isString().isLength({ max: 2000 }),
  body('quantity').optional().isFloat({ min: 0 }),
  body('image').optional().isString().trim().isLength({ min: 1 }),
  body('media').optional().isArray(),
  body('metadata').optional().isObject(),
];

const updateProductValidation = [
  param('id').isString().isLength({ min: 1 }),
  categoryValidation.optional(),
  body('productName').optional().isString().trim().isLength({ min: 2, max: 160 }),
  body('location').optional().isString().trim().isLength({ min: 2, max: 200 }),
  body('price').optional().isFloat({ min: 0 }),
  body('pricePerUnit').optional().isFloat({ min: 0 }),
  body('unit').optional().isString().trim().isLength({ min: 1, max: 30 }),
  body('description').optional().isString().isLength({ max: 2000 }),
  body('quantity').optional().isFloat({ min: 0 }),
  body('image').optional().isString(),
  body('media').optional().isArray(),
  body('metadata').optional().isObject(),
];

router.get(
  '/listings',
  [
    query('category').optional().isString(),
    query('q').optional().isString(),
    query('productName').optional().isString(),
    query('location').optional().isString(),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sortBy').optional().isIn(['newest', 'priceAsc', 'priceDesc', 'ratingDesc']),
  ],
  getListings
);

router.get('/listings/me', authMiddleware, getMyListings);
router.get('/listings/:listingId', [param('listingId').isString().isLength({ min: 1 })], getProductById);

router.post(
  '/listings',
  authMiddleware,
  createProductValidation,
  createListing
);

router.put('/listings/:id', authMiddleware, updateProductValidation, updateProduct);
router.delete('/listings/:id', authMiddleware, [param('id').isString().isLength({ min: 1 })], deleteProduct);

router.patch(
  '/listings/:listingId/status',
  authMiddleware,
  [
    param('listingId').isString().isLength({ min: 1 }),
    body('status').isIn(['active', 'inactive', 'rented', 'sold']),
  ],
  updateListingStatus
);

router.post(
  '/listings/upload-image',
  authMiddleware,
  uploadProductImageMiddleware.single('image'),
  uploadProductImage
);

// Product aliases for a clean marketplace API.
router.get('/products', getListings);
router.get('/products/:id', [param('id').isString().isLength({ min: 1 })], getProductById);
router.post('/products', authMiddleware, createProductValidation, createListing);
router.put('/products/:id', authMiddleware, updateProductValidation, updateProduct);
router.delete('/products/:id', authMiddleware, [param('id').isString().isLength({ min: 1 })], deleteProduct);
router.patch(
  '/products/:listingId/status',
  authMiddleware,
  [
    param('listingId').isString().isLength({ min: 1 }),
    body('status').isIn(['active', 'inactive', 'rented', 'sold']),
  ],
  updateListingStatus
);
router.post(
  '/products/upload-image',
  authMiddleware,
  uploadProductImageMiddleware.single('image'),
  uploadProductImage
);

export default router;