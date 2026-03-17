import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Clock3,
  MessageCircle,
  Search,
  Send,
  UserPlus,
  UserRoundCheck,
  UserRoundX,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useChatStore, type Chat, type Friend, type Message } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const formatDateHeading = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getRelationshipCopy = (friend: Friend) => {
  if (friend.canChat) return 'Connected and ready to chat';
  if (friend.incomingRequestStatus === 'pending') return 'Sent you a follow request';
  if (friend.outgoingRequestStatus === 'pending') return 'Follow request sent';
  return 'Follow each other to unlock chat';
};

export function ChatSystem() {
  const [activeTab, setActiveTab] = useState('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);

  const {
    chats,
    currentChat,
    messages,
    friends,
    followRequests,
    isTyping,
    fetchChats,
    fetchMessages,
    sendMessage,
    createChat,
    markAsRead,
    setTyping,
    setCurrentChat,
    searchUsers,
    acceptFollowRequest,
    rejectFollowRequest,
    addFriend,
    bootstrap,
  } = useChatStore();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void bootstrap();
  }, [bootstrap, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (activeTab === 'people' || activeTab === 'requests') {
      void searchUsers(searchQuery);
    }
  }, [activeTab, isAuthenticated, searchQuery, searchUsers]);

  useEffect(() => {
    if (!currentChat?.id) {
      return;
    }

    void fetchMessages(currentChat.id);
    markAsRead(currentChat.id);

    // Polling fallback — ensures messages appear even if socket drops
    const interval = setInterval(() => {
      void fetchMessages(currentChat.id);
    }, 3000);

    return () => clearInterval(interval);
  }, [currentChat?.id, fetchMessages, markAsRead]);

  // Only auto-scroll when user is already near the bottom
  useEffect(() => {
    if (isNearBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Reset scroll-anchor when opening a new chat (always scroll to bottom)
  useEffect(() => {
    isNearBottom.current = true;
  }, [currentChat?.id]);

  const filteredChats = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return chats;
    }

    return chats.filter((chat) => {
      const chatName = chat.participants.find((participant) => participant.id !== user?.id)?.name || chat.name || '';
      return chatName.toLowerCase().includes(normalizedQuery);
    });
  }, [chats, searchQuery, user?.id]);

  const filteredPeople = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return friends;
    }

    return friends.filter((friend) => {
      return (
        friend.name.toLowerCase().includes(normalizedQuery) ||
        friend.email.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [friends, searchQuery]);

  const groupedMessages = useMemo(() => {
    const grouped = messages.reduce((groups: Record<string, Message[]>, message) => {
        const key = formatDateHeading(message.createdAt);
        groups[key] = groups[key] || [];
        groups[key].push(message);
        return groups;
      }, {});

    return Object.entries(grouped) as [string, Message[]][];
  }, [messages]);

  const handleOpenChat = async (target: Chat | Friend) => {
    const chat = 'participants' in target ? target : await createChat([target.id]);
    if (!chat) {
      alert('Unable to open this chat yet. Try again after the farmer appears in search results.');
      return;
    }

    setCurrentChat(chat);
    setIsMobileChatOpen(true);
    setActiveTab('chats');
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !currentChat) {
      return;
    }

    const sent = await sendMessage(currentChat.id, messageInput);
    if (!sent) {
      return;
    }

    setMessageInput('');
    isNearBottom.current = true;
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    setTimeout(() => {
      setTyping(currentChat.id, true);
      setTimeout(() => setTyping(currentChat.id, false), 1200);
    }, 200);
  };

  const handleAcceptRequest = async (requestId: string, senderId: string) => {
    const success = await acceptFollowRequest(requestId);
    if (!success) {
      return;
    }

    const nextChat = await createChat([senderId]);
    if (nextChat) {
      setCurrentChat(nextChat);
      setIsMobileChatOpen(true);
    }
  };

  const otherParticipant = currentChat?.participants.find((participant) => participant.id !== user?.id);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-lime-50 to-stone-100 flex items-center justify-center px-4">
        <div className="max-w-md rounded-3xl border border-emerald-100 bg-white/90 p-8 text-center shadow-xl shadow-emerald-100/60 backdrop-blur">
          <MessageCircle className="mx-auto mb-4 h-14 w-14 text-emerald-500" />
          <h2 className="text-2xl font-semibold text-stone-900">Login to build your farmer network</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Register, follow nearby farmers, accept requests, and use chat to arrange rentals or crop deals.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_26%),linear-gradient(135deg,_#f3f7ef_0%,_#eef7f2_45%,_#f8f5ef_100%)] py-8">
      <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-7xl gap-4 px-4 sm:px-6 lg:px-8">
        <div className={`w-full overflow-hidden rounded-[28px] border border-emerald-100 bg-white/90 shadow-[0_20px_80px_rgba(20,83,45,0.08)] backdrop-blur sm:w-[380px] ${isMobileChatOpen ? 'hidden sm:block' : 'block'}`}>
          <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-600 via-emerald-500 to-lime-500 px-5 py-5 text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-emerald-50/80">Farmer Social</p>
                <h1 className="mt-1 text-2xl font-semibold">Follow and Chat</h1>
              </div>
              <Badge className="border border-white/20 bg-white/15 text-white hover:bg-white/20">
                {followRequests.length} pending
              </Badge>
            </div>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={activeTab === 'chats' ? 'Search chats...' : 'Search farmers...'}
                className="border-white/20 bg-white/15 pl-10 text-white placeholder:text-white/70"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-[calc(100%-116px)] flex-col">
            <TabsList className="mx-4 mt-3 grid grid-cols-3 rounded-2xl bg-emerald-50 p-1">
              <TabsTrigger value="chats">Chats</TabsTrigger>
              <TabsTrigger value="people">Farmers</TabsTrigger>
              <TabsTrigger value="requests">Requests</TabsTrigger>
            </TabsList>

            <TabsContent value="chats" className="m-0 flex-1 overflow-y-auto px-2 py-3">
              {filteredChats.length > 0 ? (
                filteredChats.map((chat) => {
                  const participant = chat.participants.find((item) => item.id !== user?.id);
                  return (
                    <button
                      key={chat.id}
                      onClick={() => void handleOpenChat(chat)}
                      className={`mb-2 flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${currentChat?.id === chat.id ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'hover:bg-stone-50'}`}
                    >
                      <Avatar className="h-12 w-12 border border-emerald-100">
                        <AvatarImage src={participant?.avatar} />
                        <AvatarFallback>{participant?.name?.[0] || 'F'}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate font-medium text-stone-900">{participant?.name || chat.name}</p>
                          {chat.lastMessage && <span className="text-xs text-stone-400">{formatTime(chat.lastMessage.createdAt)}</span>}
                        </div>
                        <p className="mt-1 truncate text-sm text-stone-500">{chat.lastMessage?.content || 'Start the first conversation'}</p>
                        <div className="mt-2 flex items-center gap-2">
                          {chat.canChat ? (
                            <Badge variant="outline" className="border-emerald-200 text-emerald-700">Chat enabled</Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-200 text-amber-700">Awaiting follow approval</Badge>
                          )}
                          {chat.unreadCount > 0 && <Badge className="bg-emerald-600 text-white">{chat.unreadCount}</Badge>}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-10 text-center text-sm text-stone-500">
                  No conversations yet. Open Farmers and send a follow request to start.
                </div>
              )}
            </TabsContent>

            <TabsContent value="people" className="m-0 flex-1 overflow-y-auto px-2 py-3">
              {filteredPeople.length > 0 ? (
                filteredPeople.map((friend) => (
                  <div key={friend.id} className="mb-3 rounded-2xl border border-stone-100 bg-stone-50/60 p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12 border border-emerald-100">
                        <AvatarImage src={friend.avatar} />
                        <AvatarFallback>{friend.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-stone-900">{friend.name}</p>
                            <p className="truncate text-xs text-stone-500">{friend.email}</p>
                          </div>
                          {friend.canChat ? (
                            <Badge className="bg-emerald-600 text-white">Connected</Badge>
                          ) : friend.outgoingRequestStatus === 'pending' ? (
                            <Badge variant="outline" className="border-amber-200 text-amber-700">Requested</Badge>
                          ) : friend.incomingRequestStatus === 'pending' ? (
                            <Badge variant="outline" className="border-sky-200 text-sky-700">Wants to follow</Badge>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm text-stone-600">{getRelationshipCopy(friend)}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="bg-white text-stone-700">
                            {friend.followersCount || 0} followers
                          </Badge>
                          <Badge variant="secondary" className="bg-white text-stone-700">
                            {friend.followingCount || 0} following
                          </Badge>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {friend.canChat ? (
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => void handleOpenChat(friend)}>
                              <MessageCircle className="mr-2 h-4 w-4" />
                              Open Chat
                            </Button>
                          ) : friend.incomingRequestId ? (
                            <>
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => void handleAcceptRequest(friend.incomingRequestId as string, friend.id)}>
                                <UserRoundCheck className="mr-2 h-4 w-4" />
                                Accept
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => void rejectFollowRequest(friend.incomingRequestId as string)}>
                                <UserRoundX className="mr-2 h-4 w-4" />
                                Decline
                              </Button>
                            </>
                          ) : friend.outgoingRequestStatus === 'pending' ? (
                            <Button size="sm" variant="outline" disabled>
                              <Clock3 className="mr-2 h-4 w-4" />
                              Waiting
                            </Button>
                          ) : (
                            <Button size="sm" className="bg-stone-900 hover:bg-stone-800" onClick={() => void addFriend(friend.id)}>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Follow
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-10 text-center text-sm text-stone-500">
                  No farmers found. Ask another registered user to sign up, then search here.
                </div>
              )}
            </TabsContent>

            <TabsContent value="requests" className="m-0 flex-1 overflow-y-auto px-2 py-3">
              {followRequests.length > 0 ? (
                followRequests.map((request) => (
                  <div key={request.id} className="mb-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12 border border-emerald-100">
                        <AvatarImage src={request.avatar} />
                        <AvatarFallback>{request.senderName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-stone-900">{request.senderName}</p>
                        <p className="truncate text-xs text-stone-500">{request.senderEmail}</p>
                        <p className="mt-2 text-sm text-stone-600">
                          Wants to follow you so you can discuss rentals, crop purchases, and local deals.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => void handleAcceptRequest(request.id, request.senderId)}>
                            <Check className="mr-2 h-4 w-4" />
                            Accept
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void rejectFollowRequest(request.id)}>
                            <UserRoundX className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-10 text-center text-sm text-stone-500">
                  No pending requests. Farmers who want to connect with you will appear here.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className={`flex min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white/92 shadow-[0_20px_80px_rgba(20,83,45,0.08)] backdrop-blur ${!isMobileChatOpen ? 'hidden sm:flex' : 'flex'}`}>
          {currentChat && otherParticipant ? (
            <>
              <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <Button size="icon" variant="ghost" className="sm:hidden" onClick={() => setIsMobileChatOpen(false)}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <Avatar className="h-12 w-12 border border-emerald-100">
                    <AvatarImage src={otherParticipant.avatar} />
                    <AvatarFallback>{otherParticipant.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-lg font-semibold text-stone-900">{otherParticipant.name}</h2>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
                      <span>{otherParticipant.email}</span>
                      {currentChat.canChat ? (
                        <Badge variant="outline" className="border-emerald-200 text-emerald-700">Chat active</Badge>
                      ) : currentChat.outgoingRequestStatus === 'pending' ? (
                        <Badge variant="outline" className="border-amber-200 text-amber-700">Follow request sent</Badge>
                      ) : (
                        <Badge variant="outline" className="border-sky-200 text-sky-700">Approval needed</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  {currentChat.canChat ? (
                    <Badge className="bg-emerald-600 text-white">Ready to rent or negotiate</Badge>
                  ) : (
                    <Badge variant="secondary">Follow first</Badge>
                  )}
                </div>
              </div>

              {!currentChat.canChat && (
                <div className="mx-5 mt-5 rounded-3xl border border-amber-100 bg-amber-50 px-5 py-5 text-stone-700">
                  <div className="flex items-start gap-3">
                    <Users className="mt-0.5 h-5 w-5 text-amber-700" />
                    <div>
                      <p className="font-medium">Chat unlocks after follow acceptance</p>
                      <p className="mt-1 text-sm leading-6 text-stone-600">
                        This keeps conversations focused and gives farmers control over who can contact them about tractor rentals, crop deals, and land opportunities.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {currentChat.incomingRequestId ? (
                          <>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => void handleAcceptRequest(currentChat.incomingRequestId as string, currentChat.id)}>
                              Accept Request
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => void rejectFollowRequest(currentChat.incomingRequestId as string)}>
                              Reject
                            </Button>
                          </>
                        ) : currentChat.outgoingRequestStatus === 'pending' ? (
                          <Button size="sm" variant="outline" disabled>
                            Follow request already sent
                          </Button>
                        ) : (
                          <Button size="sm" className="bg-stone-900 hover:bg-stone-800" onClick={() => void addFriend(currentChat.id)}>
                            Send Follow Request
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-5 py-5"
                onScroll={() => {
                  const el = messagesContainerRef.current;
                  if (el) {
                    isNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
                  }
                }}
              >
                {groupedMessages.length > 0 ? (
                  groupedMessages.map(([date, groupMessages]) => (
                    <div key={date} className="mb-6">
                      <div className="mb-4 flex items-center justify-center">
                        <span className="rounded-full bg-stone-100 px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
                          {date}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {groupMessages.map((message) => {
                          const isOwnMessage = message.senderId === user?.id;
                          return (
                            <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] rounded-[24px] px-4 py-3 shadow-sm ${isOwnMessage ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-900'}`}>
                                <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                                <div className={`mt-2 flex items-center gap-2 text-xs ${isOwnMessage ? 'text-emerald-50/80' : 'text-stone-500'}`}>
                                  <span>{formatTime(message.createdAt)}</span>
                                  {isOwnMessage && (message.isRead ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-full items-center justify-center px-4 text-center text-sm text-stone-500">
                    {currentChat.canChat
                      ? 'No messages yet. Start the conversation with rental details, crop quantity, dates, or price.'
                      : 'Once the follow request is accepted, your conversation history will appear here.'}
                  </div>
                )}

                {isTyping && currentChat.canChat && (
                  <div className="mt-4 text-sm text-stone-400">{otherParticipant.name} is typing...</div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-stone-100 px-5 py-4">
                <div className="flex items-center gap-3 rounded-3xl border border-stone-200 bg-stone-50 px-3 py-3">
                  <Input
                    value={messageInput}
                    onChange={(event) => setMessageInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void handleSendMessage();
                      }
                    }}
                    placeholder={currentChat.canChat ? 'Message about rentals, crop stock, dates, or delivery...' : 'Follow approval is required before messaging'}
                    disabled={!currentChat.canChat}
                    className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                  />
                  <Button className="rounded-2xl bg-emerald-600 hover:bg-emerald-700" onClick={() => void handleSendMessage()} disabled={!currentChat.canChat || !messageInput.trim()}>
                    <Send className="mr-2 h-4 w-4" />
                    Send
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/70 px-8 py-10 shadow-sm">
                <MessageCircle className="mx-auto h-14 w-14 text-emerald-500" />
                <h2 className="mt-5 text-2xl font-semibold text-stone-900">Farmer conversations start with trust</h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-stone-600">
                  Open the Farmers tab, follow someone you want to do business with, and once they accept you can discuss tractor rentals, crop pricing, transport, or farmland deals here.
                </p>
                <Button className="mt-6 bg-stone-900 hover:bg-stone-800" onClick={() => setActiveTab('people')}>
                  Explore Farmers
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}