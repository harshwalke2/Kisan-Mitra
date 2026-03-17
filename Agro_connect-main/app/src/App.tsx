import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './sections/Hero';
import { FarmHealth } from './sections/FarmHealth';

import { ToolsLending } from './sections/ToolsLending';
import { MarketSection } from './sections/MarketSection';
import { ChatSystem } from './sections/ChatSystem';
import { GovernmentSchemes } from './sections/GovernmentSchemes';
import { Dashboard } from './sections/Dashboard';
import { Profile } from './sections/Profile';
import { CropRecommendation } from './sections/CropRecommendation';
import { AuthModal } from './components/modals/AuthModal';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { AIChatbot } from './components/AIChatbot';
import { NotificationPanel } from './components/NotificationPanel';
import { Footer } from './sections/Footer';
import { useAuthStore } from './stores/authStore';
import { useChatStore } from './stores/chatStore';
import { useNotificationStore } from './stores/notificationStore';
import { isMongoObjectId } from './services/apiClient';
import './App.css';

export type Section =
  | 'home'
  | 'farm-health'
  | 'market'
  | 'tools-lending'
  | 'chat'
  | 'government-schemes'
  | 'crop-recommendation'
  | 'dashboard'
  | 'profile';

function App() {
  const isResetPasswordRoute = window.location.pathname === '/reset-password';

  if (isResetPasswordRoute) {
    return <ResetPasswordPage />;
  }

  const [currentSection, setCurrentSection] = useState<Section>('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);

  const { isAuthenticated, user, checkAuth } = useAuthStore();
  const { notifications, unreadCount, fetchNotifications } = useNotificationStore();

  useEffect(() => {
    checkAuth();
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated, checkAuth, fetchNotifications]);

  useEffect(() => {
    void useChatStore.getState().bootstrap();
  }, [isAuthenticated, user?.id]);

  const handleAuthClick = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleNavigateToChat = async (ownerId: string) => {
    if (!isMongoObjectId(ownerId)) {
      alert('This is a demo listing owner. Create listings with registered users to test real follow requests and chat.');
      return;
    }

    const { chats, createChat, setCurrentChat } = useChatStore.getState();

    // Check if chat already exists with this owner
    const existingChat = chats.find(chat =>
      chat.type === 'direct' &&
      chat.participants.some(p => p.id === ownerId)
    );

    if (existingChat) {
      // Open existing chat
      setCurrentChat(existingChat);
      setCurrentSection('chat');
    } else {
      const newChat = await createChat([ownerId]);
      if (newChat) {
        setCurrentChat(newChat);
        setCurrentSection('chat');
      }
    }
  };

  const renderSection = () => {
    switch (currentSection) {
      case 'home':
        return (
          <>
            <Hero onNavigate={setCurrentSection} />
            <Dashboard preview />
          </>
        );
      case 'farm-health':
        return <FarmHealth />;
      case 'market':
        return <MarketSection onNavigateToChat={handleNavigateToChat} />;
      case 'tools-lending':
        return <ToolsLending onNavigateToChat={handleNavigateToChat} />;
      case 'chat':
        return <ChatSystem />;
      case 'government-schemes':
        return <GovernmentSchemes />;
      case 'crop-recommendation':
        return <CropRecommendation />;
      case 'dashboard':
        return <Dashboard />;
      case 'profile':
        return <Profile />;
      default:
        return <Hero onNavigate={setCurrentSection} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar
        currentSection={currentSection}
        onNavigate={setCurrentSection}
        onAuthClick={handleAuthClick}
        isAuthenticated={isAuthenticated}
        user={user}
        unreadNotifications={unreadCount}
        onNotificationClick={() => setIsNotificationPanelOpen(true)}
      />

      <main className="pt-16">
        {renderSection()}
      </main>

      <Footer onNavigate={setCurrentSection} />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />

      <NotificationPanel
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
        notifications={notifications}
      />

      <AIChatbot />
    </div>
  );
}

export default App;
