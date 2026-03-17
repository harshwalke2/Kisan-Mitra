import { 
  Bell, 
  X, 
  CheckCircle, 
  Info, 
  TrendingUp,
  MessageSquare,
  Wrench,
  Sprout,
  Building2,
  Trash2,
  CheckCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotificationStore, type Notification } from '../stores/notificationStore';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
}

const getNotificationIcon = (category: string) => {
  switch (category) {
    case 'farm':
      return <Sprout className="w-5 h-5 text-green-500" />;
    case 'market':
      return <TrendingUp className="w-5 h-5 text-blue-500" />;
    case 'tools':
      return <Wrench className="w-5 h-5 text-orange-500" />;
    case 'chat':
      return <MessageSquare className="w-5 h-5 text-purple-500" />;
    case 'scheme':
      return <Building2 className="w-5 h-5 text-indigo-500" />;
    default:
      return <Info className="w-5 h-5 text-gray-500" />;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'alert':
      return 'bg-red-50 dark:bg-red-900/20 border-red-200';
    case 'warning':
      return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200';
    case 'success':
      return 'bg-green-50 dark:bg-green-900/20 border-green-200';
    default:
      return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200';
  }
};

export function NotificationPanel({ isOpen, onClose, notifications }: NotificationPanelProps) {
  const { markAsRead, markAllAsRead, removeNotification, unreadCount } = useNotificationStore();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-6 h-6 text-green-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold">Notifications</h2>
              <p className="text-xs text-gray-500">{unreadCount} unread</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={markAllAsRead}
                className="text-green-600"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Mark all read
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="flex-1">
          {notifications.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    !notification.isRead ? 'bg-gray-50/50 dark:bg-gray-800/50' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      getNotificationColor(notification.type)
                    }`}>
                      {getNotificationIcon(notification.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-medium text-sm">{notification.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          {new Date(notification.createdAt).toLocaleString()}
                        </span>
                        <div className="flex items-center gap-1">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-green-600"
                              onClick={() => markAsRead(notification.id)}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Mark read
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-red-500"
                            onClick={() => removeNotification(notification.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center p-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-600">No notifications</h3>
              <p className="text-gray-400 text-sm mt-1">
                You're all caught up! Check back later for updates.
              </p>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </>
  );
}
