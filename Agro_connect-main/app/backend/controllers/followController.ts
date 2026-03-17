import { Response } from 'express';
import { validationResult } from 'express-validator';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import FollowRequest from '../models/FollowRequest';
import User from '../models/User';

export const sendFollowRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    return;
  }

  try {
    const senderId = req.userId as string;
    const { receiverId } = req.body as { receiverId: string };

    if (senderId === receiverId) {
      res.status(400).json({ message: 'Cannot send follow request to yourself' });
      return;
    }

    const [sender, receiver] = await Promise.all([
      User.findById(senderId).select('_id'),
      User.findById(receiverId).select('_id'),
    ]);

    if (!sender || !receiver) {
      res.status(404).json({ message: 'Sender or receiver not found' });
      return;
    }

    const existing = await FollowRequest.findOne({ senderId, receiverId });
    if (existing) {
      if (existing.status === 'pending') {
        res.status(409).json({ message: 'Follow request already pending' });
        return;
      }
      existing.status = 'pending';
      await existing.save();
      res.status(200).json({ message: 'Follow request re-sent', request: existing });
      return;
    }

    const request = await FollowRequest.create({ senderId, receiverId, status: 'pending' });
    res.status(201).json({ message: 'Follow request sent', request });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send follow request' });
  }
};

export const getPendingFollowRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId as string;

    const requests = await FollowRequest.find({ receiverId: userId, status: 'pending' })
      .populate('senderId', '_id username email')
      .sort({ createdAt: -1 });

    res.status(200).json({ requests });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch follow requests' });
  }
};

export const acceptFollowRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    return;
  }

  try {
    const userId = req.userId as string;
    const { requestId } = req.body as { requestId: string };

    const request = await FollowRequest.findById(requestId);
    if (!request) {
      res.status(404).json({ message: 'Follow request not found' });
      return;
    }

    if (request.receiverId.toString() !== userId) {
      res.status(403).json({ message: 'Not authorized to accept this request' });
      return;
    }

    if (request.status !== 'pending') {
      res.status(400).json({ message: `Request already ${request.status}` });
      return;
    }

    request.status = 'accepted';
    await request.save();

    const senderId = request.senderId.toString();
    const receiverId = request.receiverId.toString();

    await Promise.all([
      User.findByIdAndUpdate(senderId, {
        $addToSet: {
          following: new Types.ObjectId(receiverId),
          followers: new Types.ObjectId(receiverId),
        },
      }),
      User.findByIdAndUpdate(receiverId, {
        $addToSet: {
          following: new Types.ObjectId(senderId),
          followers: new Types.ObjectId(senderId),
        },
      }),
    ]);

    res.status(200).json({ message: 'Follow request accepted', request });
  } catch (error) {
    res.status(500).json({ message: 'Failed to accept follow request' });
  }
};

export const rejectFollowRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    return;
  }

  try {
    const userId = req.userId as string;
    const { requestId } = req.body as { requestId: string };

    const request = await FollowRequest.findById(requestId);
    if (!request) {
      res.status(404).json({ message: 'Follow request not found' });
      return;
    }

    if (request.receiverId.toString() !== userId) {
      res.status(403).json({ message: 'Not authorized to reject this request' });
      return;
    }

    if (request.status !== 'pending') {
      res.status(400).json({ message: `Request already ${request.status}` });
      return;
    }

    request.status = 'rejected';
    await request.save();

    res.status(200).json({ message: 'Follow request rejected', request });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reject follow request' });
  }
};
