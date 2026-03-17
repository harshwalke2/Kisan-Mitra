import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth';
import FollowRequest from '../models/FollowRequest';
import User from '../models/User';
import { sendPasswordResetEmail } from '../services/emailService';

const signToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign({ userId }, secret, { expiresIn: '7d' });
};

const buildUserResponse = (user: {
  _id: Types.ObjectId | string;
  username: string;
  email: string;
  followers?: Types.ObjectId[];
  following?: Types.ObjectId[];
  createdAt?: Date;
}) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  followersCount: user.followers?.length || 0,
  followingCount: user.following?.length || 0,
  createdAt: user.createdAt,
});

export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = String(req.userId || '').trim();
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await User.findById(userId)
      .select('_id username email followers following createdAt updatedAt')
      .lean();

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({
      user: buildUserResponse(user),
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch current user' });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body as {
      username?: string;
      email?: string;
      password?: string;
    };

    if (!username || !email || !password) {
      res.status(400).json({ message: 'username, email, and password are required' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail }).select('_id');
    if (existing) {
      res.status(409).json({ message: 'Email already registered' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: username.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    const token = signToken(user._id.toString());
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: buildUserResponse(user),
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to register user' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      res.status(400).json({ message: 'email and password are required' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const token = signToken(user._id.toString());
    res.status(200).json({
      message: 'Login successful',
      token,
      user: buildUserResponse(user),
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to login' });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body as { email?: string };

    if (!email) {
      res.status(400).json({ message: 'email is required' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      res.status(200).json({
        message: 'If an account exists for this email, reset instructions have been sent.',
      });
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpires = expiresAt;
    await user.save();

    const frontendBase = process.env.FRONTEND_RESET_URL || process.env.FRONTEND_URL || process.env.FRONTEND_URLS?.split(',')[0] || 'http://localhost:5188';
    const resetLink = `${frontendBase.replace(/\/$/, '')}/reset-password?token=${rawToken}`;
    const mailResult = await sendPasswordResetEmail({
      toEmail: user.email,
      username: user.username,
      resetLink,
    });

    // Intentionally return the same response regardless of account existence.
    const payload: {
      message: string;
      delivery: 'email' | 'preview' | 'not-configured';
      previewUrl?: string;
      devResetLink?: string;
    } = {
      message: 'If an account exists for this email, reset instructions have been sent.',
      delivery: mailResult.delivered ? 'email' : mailResult.previewUrl ? 'preview' : 'not-configured',
    };

    if (mailResult.previewUrl) {
      payload.previewUrl = mailResult.previewUrl;
    }

    if (process.env.NODE_ENV === 'development' && !mailResult.delivered) {
      payload.devResetLink = resetLink;
    }

    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({ message: 'Failed to process forgot password request' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body as { token?: string; newPassword?: string };

    if (!token || !newPassword) {
      res.status(400).json({ message: 'token and newPassword are required' });
      return;
    }

    if (newPassword.length < 6 || newPassword.length > 128) {
      res.status(400).json({ message: 'newPassword must be between 6 and 128 characters' });
      return;
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({ message: 'Invalid or expired reset token' });
      return;
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reset password' });
  }
};

export const searchUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = String(req.query.q || '').trim();
    const currentUserId = String(req.userId || '').trim();

    const currentUser = currentUserId
      ? await User.findById(currentUserId).select('_id followers following').lean()
      : null;

    if (currentUserId && !currentUser) {
      res.status(404).json({ message: 'Current user not found' });
      return;
    }

    const filter: Record<string, unknown> = {};
    if (query) {
      filter.$or = [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ];
    }
    if (currentUserId) {
      filter._id = { $ne: currentUserId };
    }

    const users = await User.find(filter)
      .select('_id username email followers following createdAt')
      .sort({ username: 1 })
      .limit(50)
      .lean();

    const userIds = users.map((user) => user._id);
    const requests = currentUserId
      ? await FollowRequest.find({
          $or: [
            {
              senderId: new Types.ObjectId(currentUserId),
              receiverId: { $in: userIds },
            },
            {
              senderId: { $in: userIds },
              receiverId: new Types.ObjectId(currentUserId),
            },
          ],
        })
          .select('senderId receiverId status')
          .lean()
      : [];

    const currentFollowing = new Set((currentUser?.following || []).map((id) => id.toString()));
    const currentFollowers = new Set((currentUser?.followers || []).map((id) => id.toString()));

    const normalizedUsers = users.map((user) => {
      const userId = user._id.toString();
      const outgoingRequest = requests.find(
        (request) => request.senderId.toString() === currentUserId && request.receiverId.toString() === userId
      );
      const incomingRequest = requests.find(
        (request) => request.senderId.toString() === userId && request.receiverId.toString() === currentUserId
      );

      return {
        ...buildUserResponse(user),
        relationship: {
          isFollowing: currentFollowing.has(userId),
          followsYou: currentFollowers.has(userId),
          outgoingRequestStatus: outgoingRequest?.status || null,
          incomingRequestStatus: incomingRequest?.status || null,
          canChat:
            (currentFollowing.has(userId) && currentFollowers.has(userId)) ||
            outgoingRequest?.status === 'accepted' ||
            incomingRequest?.status === 'accepted',
        },
      };
    });

    res.status(200).json({ users: normalizedUsers });
  } catch (error) {
    res.status(500).json({ message: 'Failed to search users' });
  }
};
