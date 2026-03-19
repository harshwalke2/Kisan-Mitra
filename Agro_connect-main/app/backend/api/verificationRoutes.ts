import { Router } from 'express';
import { body } from 'express-validator';
import { getVerificationStatus, reviewVerification, submitVerification } from '../controllers/verificationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/verification/status', authMiddleware, getVerificationStatus);

router.post(
  '/verification/submit',
  authMiddleware,
  [
    body('method').isIn(['aadhaar', 'digilocker']),
    body('aadhaarNumber').optional().isString(),
    body('digilockerConsent').optional().isBoolean(),
  ],
  submitVerification
);

router.post(
  '/verification/review',
  authMiddleware,
  [
    body('userId').isString().isLength({ min: 1 }),
    body('status').isIn(['verified', 'rejected']),
    body('reason').optional().isString().isLength({ max: 240 }),
  ],
  reviewVerification
);

export default router;
