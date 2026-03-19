import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import { createAndEmitNotification } from '../services/notificationService';

const isAdminUser = (user: { role?: string; email?: string } | null): boolean => {
  if (!user) {
    return false;
  }

  if (user.role === 'admin') {
    return true;
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return Boolean(user.email && adminEmails.includes(user.email.toLowerCase()));
};

export const submitVerification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = String(req.userId || '').trim();
    const { method, aadhaarNumber, digilockerConsent } = req.body as {
      method?: 'aadhaar' | 'digilocker';
      aadhaarNumber?: string;
      digilockerConsent?: boolean;
    };

    if (!method || !['aadhaar', 'digilocker'].includes(method)) {
      res.status(400).json({ message: 'method must be aadhaar or digilocker' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (method === 'aadhaar') {
      const normalized = String(aadhaarNumber || '').replace(/\D/g, '');
      if (normalized.length !== 12) {
        res.status(400).json({ message: 'aadhaarNumber must be 12 digits' });
        return;
      }
      user.aadhaarLast4 = normalized.slice(-4);
      user.digilockerLinked = false;
    }

    if (method === 'digilocker') {
      if (!digilockerConsent) {
        res.status(400).json({ message: 'digilockerConsent is required for digilocker verification' });
        return;
      }
      user.digilockerLinked = true;
      user.aadhaarLast4 = undefined;
    }

    user.verificationMethod = method;
    user.verificationStatus = method === 'digilocker' ? 'verified' : 'pending';
    user.verificationSubmittedAt = new Date();
    user.verifiedAt = method === 'digilocker' ? new Date() : undefined;
    user.verificationRejectionReason = undefined;
    await user.save();

    if (method === 'digilocker') {
      void createAndEmitNotification({
        recipientId: user._id.toString(),
        title: 'KYC verified',
        message: 'Your profile is verified via DigiLocker.',
        type: 'success',
        category: 'system',
        actionUrl: '/profile',
      }).catch(() => undefined);
    }

    res.status(200).json({
      message: 'Verification submitted successfully',
      verification: {
        verificationStatus: user.verificationStatus,
        verificationMethod: user.verificationMethod,
        aadhaarLast4: user.aadhaarLast4,
        digilockerLinked: user.digilockerLinked,
        verificationSubmittedAt: user.verificationSubmittedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit verification' });
  }
};

export const getVerificationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = String(req.userId || '').trim();
    const user = await User.findById(userId)
      .select('_id verificationStatus verificationMethod aadhaarLast4 digilockerLinked verificationSubmittedAt verifiedAt verificationRejectionReason')
      .lean();

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({ verification: user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch verification status' });
  }
};

export const reviewVerification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reviewerId = String(req.userId || '').trim();
    const { userId, status, reason } = req.body as {
      userId?: string;
      status?: 'verified' | 'rejected';
      reason?: string;
    };

    if (!userId || !Types.ObjectId.isValid(userId)) {
      res.status(400).json({ message: 'Valid userId is required' });
      return;
    }

    if (!status || !['verified', 'rejected'].includes(status)) {
      res.status(400).json({ message: 'status must be verified or rejected' });
      return;
    }

    const reviewer = await User.findById(reviewerId).select('_id role email').lean();
    if (!isAdminUser(reviewer)) {
      res.status(403).json({ message: 'Only admin can review verification' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.verificationStatus = status;
    user.verifiedAt = status === 'verified' ? new Date() : undefined;
    user.verificationRejectionReason = status === 'rejected' ? (reason || 'KYC details did not match') : undefined;
    await user.save();

    void createAndEmitNotification({
      recipientId: user._id.toString(),
      title: status === 'verified' ? 'KYC verified' : 'KYC needs attention',
      message:
        status === 'verified'
          ? 'Your profile is now verified. A verified badge is visible to buyers.'
          : `Your KYC was rejected. ${user.verificationRejectionReason || ''}`.trim(),
      type: status === 'verified' ? 'success' : 'warning',
      category: 'system',
      actionUrl: '/profile',
    }).catch(() => undefined);

    res.status(200).json({
      message: `Verification ${status}`,
      verification: {
        verificationStatus: user.verificationStatus,
        verificationMethod: user.verificationMethod,
        verifiedAt: user.verifiedAt,
        verificationRejectionReason: user.verificationRejectionReason,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to review verification' });
  }
};
