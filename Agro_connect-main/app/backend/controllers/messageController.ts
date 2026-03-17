import { Response } from 'express';
import { validationResult } from 'express-validator';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import User from '../models/User';
import { canUsersChat } from '../services/chatAuthorization';
import { emitMessageToUser } from '../socket/chatSocket';

type ConversationParticipant = {
  _id: Types.ObjectId;
  username: string;
  email: string;
  followersCount: number;
  followingCount: number;
  createdAt?: Date;
};

export const getConversations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = String(req.userId || '').trim();
    if (!currentUserId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const conversations = await Conversation.find({
      participants: new Types.ObjectId(currentUserId),
    })
      .populate('participants', '_id username email followers following createdAt')
      .sort({ updatedAt: -1 })
      .lean();

    const normalized = conversations
      .map((conversation) => {
        const populatedParticipants = conversation.participants as unknown as Array<{
          _id: Types.ObjectId;
          username: string;
          email: string;
          followers?: Types.ObjectId[];
          following?: Types.ObjectId[];
          createdAt?: Date;
        }>;

        const participants: ConversationParticipant[] = populatedParticipants.map((participant) => ({
          _id: participant._id,
          username: participant.username,
          email: participant.email,
          followersCount: participant.followers?.length || 0,
          followingCount: participant.following?.length || 0,
          createdAt: participant.createdAt,
        }));

        const chatPartner = participants.find((participant) => participant._id.toString() !== currentUserId);

        if (!chatPartner) {
          return null;
        }

        return {
          id: chatPartner._id,
          participants,
          lastMessage: conversation.lastMessage || '',
          updatedAt: conversation.updatedAt,
          createdAt: conversation.createdAt,
        };
      })
      .filter(Boolean);

    res.status(200).json({ conversations: normalized });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
};

export const getMessagesBetweenUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.userId as string;
    const targetUserId = req.params.userId;

    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId).select('_id'),
      User.findById(targetUserId).select('_id'),
    ]);

    if (!currentUser || !targetUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const canChat = await canUsersChat(currentUserId, targetUserId);
    if (!canChat) {
      res.status(403).json({ message: 'Chat is allowed only after follow request acceptance' });
      return;
    }

    const messages = await Message.find({
      $or: [
        {
          senderId: new Types.ObjectId(currentUserId),
          receiverId: new Types.ObjectId(targetUserId),
        },
        {
          senderId: new Types.ObjectId(targetUserId),
          receiverId: new Types.ObjectId(currentUserId),
        },
      ],
    })
      .sort({ timestamp: 1 })
      .lean();

    res.status(200).json({ messages });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    return;
  }

  try {
    const senderId = req.userId as string;
    const { receiverId, message } = req.body as { receiverId: string; message: string };
    const trimmedMessage = message.trim();

    if (senderId === receiverId) {
      res.status(400).json({ message: 'Cannot send message to yourself' });
      return;
    }

    const canChat = await canUsersChat(senderId, receiverId);
    if (!canChat) {
      res.status(403).json({ message: 'Chat is allowed only after follow request acceptance' });
      return;
    }

    const savedMessage = await Message.create({
      senderId: new Types.ObjectId(senderId),
      receiverId: new Types.ObjectId(receiverId),
      message: trimmedMessage,
      timestamp: new Date(),
    });

    const realtimePayload = {
      _id: savedMessage._id,
      senderId,
      receiverId,
      message: savedMessage.message,
      timestamp: savedMessage.timestamp,
    };

    emitMessageToUser(receiverId, realtimePayload);

    const sortedParticipants = [senderId, receiverId].sort();
    void Conversation.findOneAndUpdate(
      { participants: [new Types.ObjectId(sortedParticipants[0]), new Types.ObjectId(sortedParticipants[1])] },
      {
        $set: {
          participants: [new Types.ObjectId(sortedParticipants[0]), new Types.ObjectId(sortedParticipants[1])],
          lastMessage: trimmedMessage,
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    ).catch(() => undefined);

    res.status(201).json({ message: 'Message sent', data: savedMessage });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message' });
  }
};
