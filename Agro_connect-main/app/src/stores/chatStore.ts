import { io, type Socket } from 'socket.io-client';
import { apiRequest, createAvatarUrl, getApiBaseUrl } from '../services/apiClient';
import { useNotificationStore } from './notificationStore';
import { type User, useAuthStore } from './authStore';
import { create, persist } from './zustand-mock';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'file' | 'booking-request';
  mediaUrl?: string;
  bookingRequest?: {
    bookingId: string;
    toolId: string;
    toolName: string;
    toolImage?: string;
    startDate: string;
    endDate: string;
    totalAmount: number;
    securityDeposit: number;
    status: 'pending' | 'approved' | 'rejected';
  };
  isRead: boolean;
  createdAt: string;
}

export interface ChatParticipant {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface Chat {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  avatar?: string;
  participants: ChatParticipant[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  canChat: boolean;
  outgoingRequestStatus?: 'pending' | 'accepted' | 'rejected' | null;
  incomingRequestStatus?: 'pending' | 'accepted' | 'rejected' | null;
  incomingRequestId?: string;
}

export interface Friend {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
  mutualFriends?: number;
  followersCount?: number;
  followingCount?: number;
  canChat: boolean;
  outgoingRequestStatus?: 'pending' | 'accepted' | 'rejected' | null;
  incomingRequestStatus?: 'pending' | 'accepted' | 'rejected' | null;
  incomingRequestId?: string;
}

export interface FollowRequestSummary {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  avatar?: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'rejected';
}

type SearchUserResponse = {
  _id: string;
  username: string;
  email: string;
  followersCount?: number;
  followingCount?: number;
  createdAt?: string;
  relationship?: {
    isFollowing: boolean;
    followsYou: boolean;
    outgoingRequestStatus: 'pending' | 'accepted' | 'rejected' | null;
    incomingRequestStatus: 'pending' | 'accepted' | 'rejected' | null;
    canChat: boolean;
  };
};

type ConversationResponse = {
  id: string;
  participants: Array<{
    _id: string;
    username: string;
    email: string;
    followersCount?: number;
    followingCount?: number;
    createdAt?: string;
  }>;
  lastMessage: string;
  updatedAt: string;
  createdAt: string;
};

type MessageResponse = {
  _id: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp: string;
};

interface ChatState {
  chats: Chat[];
  currentChat: Chat | null;
  messages: Message[];
  friends: Friend[];
  followRequests: FollowRequestSummary[];
  isTyping: boolean;
  typingUser: string | null;
  isBootstrapping: boolean;
  fetchChats: () => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  sendMessage: (chatId: string, content: string, type?: string, mediaUrl?: string) => Promise<boolean>;
  createChat: (participantIds: string[], type?: 'direct' | 'group', name?: string) => Promise<Chat | null>;
  markAsRead: (chatId: string) => void;
  setTyping: (chatId: string, isTyping: boolean) => void;
  addFriend: (friendId: string) => Promise<boolean>;
  removeFriend: (friendId: string) => void;
  setCurrentChat: (chat: Chat | null) => void;
  sendBookingRequest: (chatId: string, booking: any) => Promise<boolean>;
  updateBookingStatus: (messageId: string, status: 'approved' | 'rejected') => void;
  searchUsers: (query?: string) => Promise<void>;
  fetchFollowRequests: () => Promise<void>;
  acceptFollowRequest: (requestId: string) => Promise<boolean>;
  rejectFollowRequest: (requestId: string) => Promise<boolean>;
  bootstrap: () => Promise<void>;
}

let socket: Socket | null = null;
let activeSocketUserId: string | null = null;

const sortChatsByActivity = (chats: Chat[]): Chat[] => {
  return [...chats].sort((a, b) => {
    const aTime = a.lastMessage?.createdAt || a.createdAt;
    const bTime = b.lastMessage?.createdAt || b.createdAt;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });
};

const mapUserToFriend = (user: SearchUserResponse, incomingRequestId?: string): Friend => ({
  id: user._id,
  name: user.username,
  email: user.email,
  avatar: createAvatarUrl(user.username || user.email),
  isOnline: false,
  followersCount: user.followersCount || 0,
  followingCount: user.followingCount || 0,
  canChat: user.relationship?.canChat || false,
  outgoingRequestStatus: user.relationship?.outgoingRequestStatus || null,
  incomingRequestStatus: user.relationship?.incomingRequestStatus || null,
  incomingRequestId,
});

const mapMessage = (raw: MessageResponse, currentUser: User | null, chatPartner?: ChatParticipant): Message => {
  const isOwnMessage = raw.senderId === currentUser?.id;
  return {
    id: raw._id,
    chatId: isOwnMessage ? raw.receiverId : raw.senderId,
    senderId: raw.senderId,
    senderName: isOwnMessage ? currentUser?.name || 'You' : chatPartner?.name || 'Farmer',
    senderAvatar: isOwnMessage
      ? currentUser?.avatar
      : chatPartner?.avatar || createAvatarUrl(chatPartner?.name || raw.senderId),
    content: raw.message,
    type: 'text',
    isRead: isOwnMessage,
    createdAt: raw.timestamp,
  };
};

const createDirectChat = (currentUser: User, friend: Friend): Chat => ({
  id: friend.id,
  type: 'direct',
  participants: [
    {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      avatar: currentUser.avatar,
      isOnline: true,
    },
    {
      id: friend.id,
      name: friend.name,
      email: friend.email,
      avatar: friend.avatar,
      isOnline: friend.isOnline,
      lastSeen: friend.lastSeen,
    },
  ],
  unreadCount: 0,
  createdAt: new Date().toISOString(),
  canChat: friend.canChat,
  outgoingRequestStatus: friend.outgoingRequestStatus || null,
  incomingRequestStatus: friend.incomingRequestStatus || null,
  incomingRequestId: friend.incomingRequestId,
});

const getToken = (): string | null => useAuthStore.getState().token;
const getCurrentUser = (): User | null => useAuthStore.getState().user;

const notify = (title: string, message: string, category: 'chat' | 'tools' = 'chat') => {
  useNotificationStore.getState().addNotification({
    title,
    message,
    type: 'info',
    category,
    isRead: false,
  });
};

const disconnectRealtime = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    activeSocketUserId = null;
  }
};

const connectRealtime = (set: any, get: any) => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    disconnectRealtime();
    return;
  }

  if (socket && activeSocketUserId === currentUser.id) {
    return;
  }

  disconnectRealtime();

  socket = io(getApiBaseUrl(), {
    transports: ['websocket', 'polling'],
  });

  activeSocketUserId = currentUser.id;

  const joinRoom = () => {
    socket?.emit('joinUser', { userId: currentUser.id });
  };

  socket.on('connect', joinRoom);
  socket.on('reconnect', joinRoom);
  socket.on('reconnect_attempt', joinRoom);

  socket.on('receiveMessage', (payload: MessageResponse) => {
    const state = get();
    const activeUser = getCurrentUser();
    const chatId = payload.senderId === activeUser?.id ? payload.receiverId : payload.senderId;
    const chat = state.chats.find((item: Chat) => item.id === chatId);
    const chatPartner = chat?.participants.find((participant) => participant.id !== activeUser?.id);
    const nextMessage = mapMessage(payload, activeUser, chatPartner);
    const isCurrentChat = state.currentChat?.id === chatId;

    const nextChats = state.chats.some((item: Chat) => item.id === chatId)
      ? state.chats.map((item: Chat) =>
          item.id === chatId
            ? {
                ...item,
                lastMessage: nextMessage,
                unreadCount: isCurrentChat ? 0 : item.unreadCount + 1,
                canChat: true,
              }
            : item
        )
      : state.chats;

    set({
      chats: sortChatsByActivity(nextChats),
      messages: isCurrentChat ? [...state.messages, nextMessage] : state.messages,
    });

    // Notification badge updates are driven by backend receiveNotification events.
  });

  socket.on('chatError', (payload: { message?: string }) => {
    if (payload?.message) {
      notify('Chat update', payload.message);
    }
  });

  const applyIncomingNotification = (payload: Record<string, unknown>) => {
    useNotificationStore.getState().addNotificationFromServer(payload as any);
  };

  socket.on('receiveNotification', applyIncomingNotification);
  socket.on('newNotification', applyIncomingNotification);

  socket.on('presenceSnapshot', (payload: { onlineUserIds?: string[] }) => {
    const onlineSet = new Set(payload?.onlineUserIds || []);
    const currentUserId = getCurrentUser()?.id;

    set({
      chats: get().chats.map((chat: Chat) => ({
        ...chat,
        participants: chat.participants.map((participant) => ({
          ...participant,
          isOnline:
            participant.id === currentUserId
              ? true
              : onlineSet.has(participant.id),
        })),
      })),
      friends: get().friends.map((friend: Friend) => ({
        ...friend,
        isOnline: onlineSet.has(friend.id),
      })),
    });
  });

  socket.on('userOnline', (payload: { userId?: string }) => {
    const userId = String(payload?.userId || '').trim();
    if (!userId) {
      return;
    }

    set({
      chats: get().chats.map((chat: Chat) => ({
        ...chat,
        participants: chat.participants.map((participant) =>
          participant.id === userId ? { ...participant, isOnline: true } : participant
        ),
      })),
      friends: get().friends.map((friend: Friend) =>
        friend.id === userId
          ? {
              ...friend,
              isOnline: true,
            }
          : friend
      ),
    });
  });

  socket.on('userOffline', (payload: { userId?: string }) => {
    const userId = String(payload?.userId || '').trim();
    if (!userId) {
      return;
    }

    set({
      chats: get().chats.map((chat: Chat) => ({
        ...chat,
        participants: chat.participants.map((participant) =>
          participant.id === userId
            ? {
                ...participant,
                isOnline: false,
                lastSeen: new Date().toISOString(),
              }
            : participant
        ),
      })),
      friends: get().friends.map((friend: Friend) =>
        friend.id === userId
          ? {
              ...friend,
              isOnline: false,
              lastSeen: new Date().toISOString(),
            }
          : friend
      ),
    });
  });
};

export const useChatStore = create<ChatState>(
  persist(
    (set: any, get: any) => ({
      chats: [],
      currentChat: null,
      messages: [],
      friends: [],
      followRequests: [],
      isTyping: false,
      typingUser: null,
      isBootstrapping: false,

      searchUsers: async (query = '') => {
        const token = getToken();
        if (!token) {
          set({ friends: [] });
          return;
        }

        try {
          const requests = get().followRequests as FollowRequestSummary[];
          const requestBySender = new Map(requests.map((request) => [request.senderId, request.id]));
          const data = await apiRequest<{ users: SearchUserResponse[] }>(`/api/users/search?q=${encodeURIComponent(query)}`, {
            token,
          });

          set({
            friends: data.users.map((user) => mapUserToFriend(user, requestBySender.get(user._id))),
          });
        } catch (error) {
          notify('People search failed', 'Unable to load registered farmers right now.');
        }
      },

      fetchFollowRequests: async () => {
        const token = getToken();
        if (!token) {
          set({ followRequests: [] });
          return;
        }

        try {
          const data = await apiRequest<{
            requests: Array<{
              _id: string;
              status: 'pending' | 'accepted' | 'rejected';
              createdAt: string;
              senderId: {
                _id: string;
                username: string;
                email: string;
              };
            }>;
          }>('/api/follow-requests', { token });

          const followRequests = data.requests.map((request) => ({
            id: request._id,
            senderId: request.senderId._id,
            senderName: request.senderId.username,
            senderEmail: request.senderId.email,
            avatar: createAvatarUrl(request.senderId.username),
            createdAt: request.createdAt,
            status: request.status,
          }));

          set({ followRequests });
        } catch (error) {
          notify('Requests unavailable', 'Unable to load follow requests right now.');
        }
      },

      fetchChats: async () => {
        const token = getToken();
        const currentUser = getCurrentUser();
        if (!token || !currentUser) {
          set({ chats: [] });
          return;
        }

        try {
          const data = await apiRequest<{ conversations: ConversationResponse[] }>('/api/conversations', { token });
          const chats = data.conversations.map((conversation) => {
            const otherParticipant = conversation.participants.find((participant) => participant._id !== currentUser.id);
            const lastMessage: Message | undefined = conversation.lastMessage
              ? {
                  id: `${conversation.id}-last`,
                  chatId: conversation.id,
                  senderId: otherParticipant?._id || conversation.id,
                  senderName: otherParticipant?.username || 'Farmer',
                  senderAvatar: createAvatarUrl(otherParticipant?.username || conversation.id),
                  content: conversation.lastMessage,
                  type: 'text',
                  isRead: true,
                  createdAt: conversation.updatedAt,
                }
              : undefined;

            return {
              id: conversation.id,
              type: 'direct' as const,
              participants: conversation.participants.map((participant) => ({
                id: participant._id,
                name: participant.username,
                email: participant.email,
                avatar: createAvatarUrl(participant.username),
                isOnline: false,
              })),
              avatar: createAvatarUrl(otherParticipant?.username || conversation.id),
              unreadCount: 0,
              createdAt: conversation.createdAt,
              lastMessage,
              canChat: true,
              outgoingRequestStatus: 'accepted' as const,
              incomingRequestStatus: 'accepted' as const,
            };
          });

          set({ chats: sortChatsByActivity(chats) });
        } catch (error) {
          notify('Chat list failed', 'Unable to load your conversations right now.');
        }
      },

      fetchMessages: async (chatId: string) => {
        const token = getToken();
        const currentUser = getCurrentUser();
        const chat = get().chats.find((item: Chat) => item.id === chatId) || get().currentChat;

        if (!token || !currentUser || !chatId) {
          set({ messages: [] });
          return;
        }

        try {
          const data = await apiRequest<{ messages: MessageResponse[] }>(`/api/messages/${chatId}`, { token });
          const chatPartner = chat?.participants.find((participant) => participant.id !== currentUser.id);
          const fetched = data.messages.map((message) => mapMessage(message, currentUser, chatPartner));

          // Merge: keep optimistic (tmp-*) messages that haven't been confirmed yet,
          // then deduplicate by real id so socket + poll don't double-up.
          const existing: Message[] = get().messages;
          const fetchedIds = new Set(fetched.map((m: Message) => m.id));
          const optimistic = existing.filter(
            (m: Message) => m.id.startsWith('tmp-') && !fetchedIds.has(m.id)
          );
          set({ messages: [...fetched, ...optimistic] });
        } catch (error: any) {
          if (error?.status === 403) {
            set({ messages: [] });
          } else {
            // Silent on poll errors to avoid notification spam
          }
        }
      },

      sendMessage: async (chatId: string, content: string, type = 'text', mediaUrl?: string) => {
        const token = getToken();
        const currentUser = getCurrentUser();
        const chat = get().chats.find((item: Chat) => item.id === chatId) || get().currentChat;

        if (!token || !currentUser || !chat) {
          return false;
        }

        if (!content.trim()) {
          return false;
        }

        if (!chat.canChat) {
          notify('Follow request required', 'This farmer must accept your follow request before you can chat.');
          return false;
        }

        const payload = type === 'booking-request' && mediaUrl ? `${content}\n${mediaUrl}` : content;
        const optimisticId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const messageType: Message['type'] = type === 'booking-request' ? 'booking-request' : 'text';
        const optimisticMessage: Message = {
          id: optimisticId,
          chatId,
          senderId: currentUser.id,
          senderName: currentUser.name || 'You',
          senderAvatar: currentUser.avatar,
          content: payload,
          type: messageType,
          isRead: false,
          createdAt: new Date().toISOString(),
        };

        set({
          messages: [...get().messages, optimisticMessage],
          chats: sortChatsByActivity(
            get().chats.map((item: Chat) =>
              item.id === chatId
                ? {
                    ...item,
                    lastMessage: optimisticMessage,
                    canChat: true,
                  }
                : item
            )
          ),
        });

        try {
          const data = await apiRequest<{ data: MessageResponse }>('/api/messages', {
            method: 'POST',
            token,
            body: {
              receiverId: chatId,
              message: payload,
            },
          });

          const chatPartner = chat.participants.find((participant) => participant.id !== currentUser.id);
          const nextMessage = mapMessage(data.data, currentUser, chatPartner);

          set({
            messages: get().messages.map((message: Message) =>
              message.id === optimisticId ? nextMessage : message
            ),
            chats: sortChatsByActivity(
              get().chats.map((item: Chat) =>
                item.id === chatId
                  ? {
                      ...item,
                      lastMessage: nextMessage,
                      canChat: true,
                    }
                  : item
              )
            ),
          });

          return true;
        } catch (error: any) {
          set({
            messages: get().messages.filter((message: Message) => message.id !== optimisticId),
          });
          notify('Message failed', error?.message || 'Unable to send your message right now.');
          return false;
        }
      },

      createChat: async (participantIds: string[], type = 'direct') => {
        if (type !== 'direct' || participantIds.length === 0) {
          return null;
        }

        const currentUser = getCurrentUser();
        if (!currentUser) {
          return null;
        }

        const targetId = participantIds[0];
        const existingChat = get().chats.find((chat: Chat) => chat.id === targetId);
        if (existingChat) {
          set({ currentChat: existingChat });
          return existingChat;
        }

        let friend = get().friends.find((item: Friend) => item.id === targetId);
        if (!friend) {
          await get().searchUsers('');
          friend = get().friends.find((item: Friend) => item.id === targetId);
        }

        if (!friend) {
          return null;
        }

        const newChat = createDirectChat(currentUser, friend);
        set({
          chats: sortChatsByActivity([newChat, ...get().chats]),
          currentChat: newChat,
        });
        return newChat;
      },

      markAsRead: (chatId: string) => {
        set({
          chats: get().chats.map((chat: Chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  unreadCount: 0,
                }
              : chat
          ),
          messages: get().messages.map((message: Message) =>
            message.chatId === chatId
              ? {
                  ...message,
                  isRead: true,
                }
              : message
          ),
        });
      },

      setTyping: (_chatId: string, isTyping: boolean) => {
        set({
          isTyping,
          typingUser: isTyping ? 'Farmer' : null,
        });
      },

      addFriend: async (friendId: string) => {
        const token = getToken();
        if (!token) {
          return false;
        }

        try {
          await apiRequest('/api/follow-request', {
            method: 'POST',
            token,
            body: { receiverId: friendId },
          });

          notify('Request sent', 'Your follow request has been sent.');
          await Promise.all([get().fetchFollowRequests(), get().searchUsers('')]);
          return true;
        } catch (error: any) {
          notify('Request failed', error?.message || 'Unable to send follow request.');
          return false;
        }
      },

      removeFriend: (friendId: string) => {
        set({ friends: get().friends.filter((friend: Friend) => friend.id !== friendId) });
      },

      setCurrentChat: (chat: Chat | null) => {
        set({ currentChat: chat });
      },

      sendBookingRequest: async (chatId: string, booking: any) => {
        const message = [
          `Rental request for ${booking.toolName}`,
          `Dates: ${new Date(booking.startDate).toLocaleDateString()} to ${new Date(booking.endDate).toLocaleDateString()}`,
          `Amount: Rs ${booking.totalAmount}`,
          booking.securityDeposit ? `Security deposit: Rs ${booking.securityDeposit}` : null,
        ]
          .filter(Boolean)
          .join('\n');

        return get().sendMessage(chatId, message, 'booking-request');
      },

      updateBookingStatus: (messageId: string, status: 'approved' | 'rejected') => {
        set({
          messages: get().messages.map((message: Message) =>
            message.id === messageId && message.bookingRequest
              ? {
                  ...message,
                  bookingRequest: {
                    ...message.bookingRequest,
                    status,
                  },
                }
              : message
          ),
        });
      },

      acceptFollowRequest: async (requestId: string) => {
        const token = getToken();
        if (!token) {
          return false;
        }

        try {
          await apiRequest('/api/follow-request/accept', {
            method: 'POST',
            token,
            body: { requestId },
          });

          notify('Request accepted', 'You can chat with this farmer now.');
          await Promise.all([get().fetchFollowRequests(), get().searchUsers(''), get().fetchChats()]);
          return true;
        } catch (error: any) {
          notify('Accept failed', error?.message || 'Unable to accept the follow request.');
          return false;
        }
      },

      rejectFollowRequest: async (requestId: string) => {
        const token = getToken();
        if (!token) {
          return false;
        }

        try {
          await apiRequest('/api/follow-request/reject', {
            method: 'POST',
            token,
            body: { requestId },
          });

          notify('Request rejected', 'The follow request was declined.');
          await Promise.all([get().fetchFollowRequests(), get().searchUsers('')]);
          return true;
        } catch (error: any) {
          notify('Reject failed', error?.message || 'Unable to reject the follow request.');
          return false;
        }
      },

      bootstrap: async () => {
        const token = getToken();
        const currentUser = getCurrentUser();
        if (!token || !currentUser) {
          disconnectRealtime();
          set({
            chats: [],
            currentChat: null,
            messages: [],
            friends: [],
            followRequests: [],
            isBootstrapping: false,
          });
          return;
        }

        set({ isBootstrapping: true });
        connectRealtime(set, get);

        await Promise.all([get().fetchFollowRequests(), get().searchUsers(''), get().fetchChats()]);

        const selectedChat = get().currentChat;
        if (selectedChat?.id) {
          const refreshedChat = get().chats.find((chat: Chat) => chat.id === selectedChat.id) || selectedChat;
          set({ currentChat: refreshedChat });
        }

        set({ isBootstrapping: false });
      },
    }),
    { name: 'chat-storage' }
  )
);