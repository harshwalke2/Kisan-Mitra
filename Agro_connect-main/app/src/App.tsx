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

const TOUR_COMPLETED_KEY = 'agroconnect_onboarding_tour_completed_v1';

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
  const isResetPasswordRoute = window.location.pathname.startsWith('/reset-password');

  if (isResetPasswordRoute) {
    return <ResetPasswordPage />;
  }

  const [currentSection, setCurrentSection] = useState<Section>('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isDemoTourOpen, setIsDemoTourOpen] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [hasCompletedTour, setHasCompletedTour] = useState<boolean>(() => {
    return localStorage.getItem(TOUR_COMPLETED_KEY) === 'true';
  });

  const demoSteps: Array<{ section: Section; title: string; message: string }> = [
    {
      section: 'crop-recommendation',
      title: 'Step 1: AI Crop Advisor',
      message: 'Show how farmers get crop suggestions with profit and fertilizer guidance.',
    },
    {
      section: 'market',
      title: 'Step 2: Smart Marketplace',
      message: 'Demonstrate advanced filters, verified seller badges, and quick availability checks.',
    },
    {
      section: 'chat',
      title: 'Step 3: Real-time Communication',
      message: 'Highlight chat with live notifications and booking updates.',
    },
    {
      section: 'profile',
      title: 'Step 4: Trust and Verification',
      message: 'Show KYC verification and trust score breakdown for buyer confidence.',
    },
  ];

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

  useEffect(() => {
    if (!hasCompletedTour) {
      setDemoStep(0);
      setCurrentSection(demoSteps[0].section);
      setIsDemoTourOpen(true);
    }
  }, [hasCompletedTour]);

  const handleAuthClick = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const startDemoTour = () => {
    if (hasCompletedTour) {
      return;
    }
    setDemoStep(0);
    setCurrentSection(demoSteps[0].section);
    setIsDemoTourOpen(true);
  };

  const closeDemoTour = () => {
    setIsDemoTourOpen(false);
    setHasCompletedTour(true);
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
  };

  const moveDemoStep = (direction: -1 | 1) => {
    const nextStep = Math.max(0, Math.min(demoSteps.length - 1, demoStep + direction));
    setDemoStep(nextStep);
    setCurrentSection(demoSteps[nextStep].section);
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
            <Hero
              onNavigate={setCurrentSection}
              onStartDemoTour={hasCompletedTour ? undefined : startDemoTour}
            />
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
        return (
          <Hero
            onNavigate={setCurrentSection}
            onStartDemoTour={hasCompletedTour ? undefined : startDemoTour}
          />
        );
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

      {isDemoTourOpen && (
        <div className="fixed bottom-6 left-1/2 z-[70] w-[92%] max-w-3xl -translate-x-1/2 rounded-xl border border-emerald-200 bg-white p-4 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-emerald-700">Guided Demo Tour</p>
            <button
              className="text-sm text-gray-500 hover:text-gray-700"
              onClick={closeDemoTour}
            >
              Close
            </button>
          </div>
          <p className="font-medium">{demoSteps[demoStep].title}</p>
          <p className="mt-1 text-sm text-gray-600">{demoSteps[demoStep].message}</p>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-gray-500">{demoStep + 1} / {demoSteps.length}</p>
            <div className="flex gap-2">
              <button
                className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
                disabled={demoStep === 0}
                onClick={() => moveDemoStep(-1)}
              >
                Back
              </button>
              {demoStep < demoSteps.length - 1 ? (
                <button
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white"
                  onClick={() => moveDemoStep(1)}
                >
                  Next
                </button>
              ) : (
                <button
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white"
                  onClick={closeDemoTour}
                >
                  Finish
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
