import { useState } from 'react';
import {
  Sprout,
  Heart,
  TrendingUp,
  Wrench,
  ShoppingCart,
  MessageCircle,
  Building2,
  LayoutDashboard,
  User,
  LogIn,
  Bell,
  Menu,
  X,
  Globe,
  Sun,
  Moon,
  FlaskConical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Section } from '../App';
import type { User as UserType } from '../stores/authStore';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';

import { useLanguageStore, type LanguageCode } from '../stores/languageStore';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'mr', label: 'मराठी' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'bn', label: 'বাংলা' },
];

interface NavbarProps {
  currentSection: Section;
  onNavigate: (section: Section) => void;
  onAuthClick: (mode: 'login' | 'register') => void;
  isAuthenticated: boolean;
  user: UserType | null;
  unreadNotifications: number;
  onNotificationClick: () => void;
}

export function Navbar({
  currentSection,
  onNavigate,
  onAuthClick,
  isAuthenticated,
  user,
  unreadNotifications,
  onNotificationClick
}: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { language: currentLanguage, setLanguage, t } = useLanguageStore();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { notifications, markAsRead, markAllAsRead } = useNotificationStore();

  const latestNotifications = notifications.slice(0, 5);

  const navItems: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: 'farm-health', label: t('nav.farmHealth'), icon: Heart },
    { id: 'crop-recommendation', label: 'Crop AI', icon: FlaskConical },
    { id: 'market', label: t('nav.market'), icon: TrendingUp },
    { id: 'tools-lending', label: t('nav.tools'), icon: Wrench },
    { id: 'chat', label: t('nav.chat'), icon: MessageCircle },
    { id: 'government-schemes', label: t('nav.schemes'), icon: Building2 },
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
  ];

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-green-100 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => onNavigate('home')}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              AgroConnect
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden xl:inline">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden sm:flex">
                  <Globe className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLanguage(lang.code as LanguageCode)}
                    className={currentLanguage === lang.code ? 'bg-green-50' : ''}
                  >
                    {lang.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="hidden sm:flex"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            {/* Notifications */}
            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadNotifications > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center p-0 text-xs"
                      >
                        {unreadNotifications > 99 ? '99+' : unreadNotifications}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[360px] p-0">
                  <div className="flex items-center justify-between px-3 py-2 border-b">
                    <div>
                      <p className="text-sm font-semibold">Notifications</p>
                      <p className="text-xs text-gray-500">{unreadNotifications} unread</p>
                    </div>
                    {unreadNotifications > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-green-700"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void markAllAsRead();
                        }}
                      >
                        Mark all read
                      </Button>
                    )}
                  </div>

                  {latestNotifications.length > 0 ? (
                    <ScrollArea className="max-h-80">
                      {latestNotifications.map((notification) => (
                        <DropdownMenuItem
                          key={notification.id}
                          className="cursor-pointer items-start gap-2 px-3 py-2"
                          onSelect={(event) => {
                            event.preventDefault();
                            if (!notification.isRead) {
                              void markAsRead(notification.id);
                            }
                          }}
                        >
                          <div className={`mt-1 h-2 w-2 rounded-full ${
                            notification.isRead ? 'bg-gray-300' : 'bg-green-500'
                          }`} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{notification.title}</p>
                            <p className="line-clamp-2 text-xs text-gray-500">{notification.message}</p>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </ScrollArea>
                  ) : (
                    <div className="px-3 py-6 text-center text-sm text-gray-500">No notifications yet</div>
                  )}

                  <DropdownMenuSeparator />
                  <div className="p-2">
                    <Button variant="outline" className="w-full" onClick={onNotificationClick}>
                      View all notifications
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Auth Buttons or User Profile */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium">{user?.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onNavigate('profile')}>
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNavigate('dashboard')}>
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => useAuthStore.getState().logout()}
                    className="text-red-600"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => onAuthClick('login')}
                >
                  Login
                </Button>
                <Button
                  onClick={() => onAuthClick('register')}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  Register
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-green-100 dark:border-gray-800">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                );
              })}
              {!isAuthenticated && (
                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="outline"
                    onClick={() => {
                      onAuthClick('login');
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    Login
                  </Button>
                  <Button
                    onClick={() => {
                      onAuthClick('register');
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-gradient-to-r from-green-600 to-emerald-600"
                  >
                    Register
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
