import { useEffect } from 'react';
import {
  LayoutDashboard,
  Sprout,
  TrendingUp,
  Wrench,
  ShoppingCart,
  MessageSquare,
  Bell,
  CloudSun,
  Droplets,
  Wind,
  Thermometer,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  Package,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '../stores/authStore';
import { useFarmHealthStore } from '../stores/farmHealthStore';
import { useMarketStore } from '../stores/marketStore';
import { useToolsStore } from '../stores/toolsStore';
import { useNotificationStore } from '../stores/notificationStore';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

import { useLanguageStore } from '../stores/languageStore';

interface DashboardProps {
  preview?: boolean;
}

export function Dashboard({ preview = false }: DashboardProps) {
  const { t } = useLanguageStore();
  const { isAuthenticated, user } = useAuthStore();
  const { crops, weather, alerts, fetchCrops, fetchWeather } = useFarmHealthStore();
  const { cropPrices } = useMarketStore();
  const { myTools, myBookings } = useToolsStore();
  const { notifications, unreadCount } = useNotificationStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchCrops();
      fetchWeather(20.5937, 78.9629);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated && !preview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <LayoutDashboard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600">Please login to view your dashboard</h2>
        </div>
      </div>
    );
  }

  const activeAlerts = alerts.filter(a => a.isActive);
  const pendingBookings = myBookings.filter(b => b.status === 'pending');
  const recentNotifications = notifications.slice(0, 5);

  // Mock data for charts
  const salesData = [
    { month: 'Jan', sales: 45000 },
    { month: 'Feb', sales: 52000 },
    { month: 'Mar', sales: 48000 },
    { month: 'Apr', sales: 61000 },
    { month: 'May', sales: 58000 },
    { month: 'Jun', sales: 67000 },
  ];

  const cropDistribution = crops.map(crop => ({
    name: crop.cropName,
    value: crop.healthScore
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-green-600" />
            {preview ? 'Dashboard Preview' : t('dashboard.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('dashboard.subtitle')}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">{t('dashboard.farmHealth')}</p>
                  <p className="text-2xl font-bold">
                    {Math.round(crops.reduce((acc, c) => acc + c.healthScore, 0) / crops.length || 0)}%
                  </p>
                </div>
                <Sprout className="w-8 h-8 text-green-100" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{t('dashboard.activeListings')}</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{t('dashboard.toolsListed')}</p>
                  <p className="text-2xl font-bold">{myTools.length}</p>
                </div>
                <Wrench className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{t('dashboard.notifications')}</p>
                  <p className="text-2xl font-bold">{unreadCount}</p>
                </div>
                <Bell className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid: Custom Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Row 1: Weather (2/3) + Alerts (1/3) */}
          <div className="lg:col-span-2">
            {weather && (
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CloudSun className="w-5 h-5 text-yellow-500" />
                    {t('dashboard.weather')} {user?.location?.address || t('dashboard.yourLocation') || 'Your Location'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <Thermometer className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{t('dashboard.temp')}</p>
                        <p className="font-semibold">{weather.temperature}°C</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Droplets className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{t('dashboard.humidity')}</p>
                        <p className="font-semibold">{weather.humidity}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Wind className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{t('dashboard.wind')}</p>
                        <p className="font-semibold">{weather.windSpeed} km/h</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
                        <CloudSun className="w-5 h-5 text-cyan-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{t('dashboard.rainfall')}</p>
                        <p className="font-semibold">{weather.rainfall} mm</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  {t('dashboard.alerts')}
                  {activeAlerts.length > 0 && (
                    <Badge variant="destructive" className="ml-auto">
                      {activeAlerts.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeAlerts.length > 0 ? (
                  <div className="space-y-3">
                    {activeAlerts.slice(0, 3).map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-lg ${alert.severity === 'critical' ? 'bg-red-50 dark:bg-red-900/20' :
                          alert.severity === 'high' ? 'bg-orange-50 dark:bg-orange-900/20' :
                            'bg-yellow-50 dark:bg-yellow-900/20'
                          }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className={`w-4 h-4 ${alert.severity === 'critical' ? 'text-red-600' :
                            alert.severity === 'high' ? 'text-orange-600' :
                              'text-yellow-600'
                            }`} />
                          <span className="font-medium text-sm capitalize">{alert.type} {t('dashboard.alert') || 'Alert'}</span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">{alert.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                    <p className="text-gray-500">{t('dashboard.noAlerts')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Sales Overview - Full Width */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  {t('dashboard.sales')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="sales"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: '#10b981' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Market Prices - Full Width */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-green-500" />
                  {t('dashboard.prices')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {cropPrices.slice(0, 4).map((crop) => (
                    <div key={crop.id} className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-1">{crop.cropName}</h4>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold">₹{crop.currentPrice.toLocaleString()}</span>
                        <span className="text-sm text-gray-500">{t('dashboard.perQuintal') || '/quintal'}</span>
                      </div>
                      <div className={`flex items-center gap-1 text-sm ${crop.priceChange >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {crop.priceChange >= 0 ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                        <span>{Math.abs(crop.priceChangePercent)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 4: Notifications (1/3) + Bookings (1/3) + Quick Actions (1/3) */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5 text-purple-500" />
                  {t('dashboard.recentNav')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentNotifications.slice(0, 4).map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg ${!notification.isRead ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-gray-50 dark:bg-gray-800'
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={notification.type === 'alert' ? 'destructive' : 'default'} className="text-xs">
                          {notification.category}
                        </Badge>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-purple-500 rounded-full" />
                        )}
                      </div>
                      <p className="font-medium text-sm truncate">{notification.title}</p>
                      <p className="text-xs text-gray-500 truncate">{notification.message}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  {t('dashboard.pending')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingBookings.length > 0 ? (
                  <div className="space-y-3">
                    {pendingBookings.slice(0, 4).map((booking) => (
                      <div key={booking.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="font-medium text-sm">{booking.toolName}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">₹{booking.totalAmount}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">{t('dashboard.noPending')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{t('dashboard.quick')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1">
                    <Sprout className="w-5 h-5" />
                    <span className="text-xs">{t('dashboard.checkCrops')}</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1">
                    <ShoppingCart className="w-5 h-5" />
                    <span className="text-xs">{t('dashboard.newListing')}</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1">
                    <Wrench className="w-5 h-5" />
                    <span className="text-xs">{t('dashboard.listTool')}</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1">
                    <MessageSquare className="w-5 h-5" />
                    <span className="text-xs">{t('dashboard.messages')}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 5: Crop Health (2/3) + Image (1/3) */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sprout className="w-5 h-5 text-green-500" />
                  {t('dashboard.cropStatus')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  {crops.map((crop) => (
                    <div key={crop.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{crop.cropName}</h4>
                        <Badge className={
                          crop.healthScore >= 80 ? 'bg-green-100 text-green-700' :
                            crop.healthScore >= 60 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                        }>
                          {crop.healthScore}%
                        </Badge>
                      </div>
                      <Progress value={crop.healthScore} className="h-2 mb-2" />
                      <p className="text-xs text-gray-500 capitalize">{crop.status}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <div className="relative rounded-xl overflow-hidden shadow-sm h-full group min-h-[250px]">
              <img
                src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200&q=80"
                alt="Smart Farming"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-6">
                <h3 className="text-2xl font-bold text-white mb-2">{t('dashboard.sustainable')}</h3>
                <p className="text-white/90">{t('dashboard.joinMovement')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
