import { Server, Socket } from 'socket.io';
import { Types } from 'mongoose';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import User from '../models/User';
import { canUsersChat } from '../services/chatAuthorization';

type SendMessagePayload = {
  senderId: string;
  receiverId: string;
  message: string;
};

const onlineUsers = new Map<string, string>();
let ioRef: Server | null = null;

const saveMessage = async (senderId: string, receiverId: string, messageText: string) => {
  const saved = await Message.create({
    senderId: new Types.ObjectId(senderId),
    receiverId: new Types.ObjectId(receiverId),
    message: messageText,
    timestamp: new Date(),
  });

  const sortedParticipants = [senderId, receiverId].sort();
  void Conversation.findOneAndUpdate(
    { participants: [new Types.ObjectId(sortedParticipants[0]), new Types.ObjectId(sortedParticipants[1])] },
    {
      $set: {
        participants: [new Types.ObjectId(sortedParticipants[0]), new Types.ObjectId(sortedParticipants[1])],
        lastMessage: messageText,
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  ).catch(() => undefined);

  return saved;
};

export const emitMessageToUser = (receiverId: string, payload: Record<string, unknown>): void => {
  if (!ioRef) {
    return;
  }
  ioRef.to(receiverId).emit('receiveMessage', payload);
};

export const emitNotificationToUser = (receiverId: string, payload: Record<string, unknown>): void => {
  if (!ioRef) {
    return;
  }
  ioRef.to(receiverId).emit('receiveNotification', payload);
};

export const initChatSocket = (io: Server): void => {
  ioRef = io;

  io.on('connection', (socket: Socket) => {
    socket.on('joinUser', async (payload: { userId?: string }) => {
      const userId = payload?.userId?.trim();

      if (!userId) {
        socket.emit('chatError', { message: 'userId is required for joinUser' });
        return;
      }

      const exists = await User.findById(userId).select('_id');
      if (!exists) {
        socket.emit('chatError', { message: 'Invalid userId' });
        return;
      }

      onlineUsers.set(userId, socket.id);
      socket.join(userId);
      socket.emit('joined', { userId, socketId: socket.id });
      io.emit('userOnline', { userId });
      socket.emit('presenceSnapshot', { onlineUserIds: Array.from(onlineUsers.keys()) });
    });

    socket.on('sendMessage', async (payload: SendMessagePayload) => {
      try {
        const senderId = payload?.senderId?.trim();
        const receiverId = payload?.receiverId?.trim();
        const messageText = payload?.message?.trim();

        if (!senderId || !receiverId || !messageText) {
          socket.emit('chatError', { message: 'senderId, receiverId and message are required' });
          return;
        }

        if (senderId === receiverId) {
          socket.emit('chatError', { message: 'Cannot send message to yourself' });
          return;
        }

        const canChat = await canUsersChat(senderId, receiverId);
        if (!canChat) {
          socket.emit('chatError', {
            message: 'Chat blocked. Follow request must be accepted before messaging.',
          });
          return;
        }

        const saved = await saveMessage(senderId, receiverId, messageText);

        const responsePayload = {
          _id: saved._id,
          senderId,
          receiverId,
          message: saved.message,
          timestamp: saved.timestamp,
        };

        io.to(receiverId).emit('receiveMessage', responsePayload);
        socket.emit('messageSent', responsePayload);
      } catch (error) {
        socket.emit('chatError', { message: 'Failed to send message' });
      }
    });

    socket.on('disconnect', () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          io.emit('userOffline', { userId });
          break;
        }
      }
    });
  });
};
