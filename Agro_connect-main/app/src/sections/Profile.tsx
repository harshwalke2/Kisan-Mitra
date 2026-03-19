import { useEffect, useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Sprout, 
  Tractor,
  Camera,
  Edit2,
  Save,
  Globe,
  Shield,
  Bell,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '../stores/authStore';
import { fetchUserProfile, fetchVerificationStatus, submitVerificationRequest } from '../services/socialFeatureService';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी (Hindi)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
];

const soilTypes = [
  'Alluvial',
  'Black',
  'Red',
  'Laterite',
  'Desert',
  'Mountain',
  'Loamy',
  'Sandy',
  'Clay'
];

export function Profile() {
  const { user, isAuthenticated, updateProfile, logout } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(user);
  const [socialStats, setSocialStats] = useState<{
    followersCount: number;
    followingCount: number;
    totalListings: number;
    activeListings: number;
    averageRating: number;
    totalReviews: number;
    trustScore: number;
    trustBreakdown?: {
      ratingScore: number;
      completionScore: number;
      reviewVolumeScore: number;
      weightedRating: number;
      weightedCompletion: number;
      weightedReviewVolume: number;
      totalBookings: number;
      completedBookings: number;
    };
  } | null>(null);
  const [recentReviews, setRecentReviews] = useState<
    Array<{
      _id: string;
      rating: number;
      comment?: string;
      createdAt: string;
      reviewerId?: {
        username: string;
      };
    }>
  >([]);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    marketAlerts: true,
    schemeAlerts: true,
    weatherAlerts: true
  });
  const [verificationMethod, setVerificationMethod] = useState<'aadhaar' | 'digilocker'>('aadhaar');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationState, setVerificationState] = useState<any>(null);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600">Please login to view your profile</h2>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let cancelled = false;
    fetchUserProfile(user.id)
      .then((data) => {
        if (cancelled) {
          return;
        }

        setSocialStats({
          followersCount: data.profile.followersCount,
          followingCount: data.profile.followingCount,
          totalListings: data.profile.totalListings,
          activeListings: data.profile.activeListings,
          averageRating: data.profile.averageRating,
          totalReviews: data.profile.totalReviews,
          trustScore: data.profile.trustScore,
          trustBreakdown: data.profile.trustBreakdown,
        });
        setRecentReviews(data.reviews || []);
      })
      .catch(() => {
        // Keep current profile usable even if social stats call fails.
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    fetchVerificationStatus()
      .then((data) => setVerificationState(data.verification))
      .catch(() => undefined);
  }, [isAuthenticated]);

  const handleSubmitVerification = async () => {
    try {
      setVerificationLoading(true);
      const payload =
        verificationMethod === 'aadhaar'
          ? { method: 'aadhaar' as const, aadhaarNumber }
          : { method: 'digilocker' as const, digilockerConsent: true };

      const response = await submitVerificationRequest(payload);
      setVerificationState(response.verification);
      alert('Verification submitted successfully. Status is now pending review.');
    } catch (error) {
      alert('Verification submission failed. Please check your details and try again.');
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleSave = () => {
    if (editedUser) {
      updateProfile(editedUser);
      setIsEditing(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <User className="w-8 h-8 text-green-600" />
            My Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your account settings and preferences
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="farm">Farm Details</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Followers</p>
                  <p className="mt-2 text-2xl font-semibold">{socialStats?.followersCount ?? user?.followersCount ?? 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Following</p>
                  <p className="mt-2 text-2xl font-semibold">{socialStats?.followingCount ?? user?.followingCount ?? 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Active Listings</p>
                  <p className="mt-2 text-2xl font-semibold">{socialStats?.activeListings ?? 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Trust Score</p>
                  <p className="mt-2 text-2xl font-semibold text-green-600">{socialStats?.trustScore ?? 0}%</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback className="text-2xl">{user?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <button className="absolute bottom-0 right-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-center sm:text-left flex-1">
                    <h2 className="text-2xl font-bold">{user?.name}</h2>
                    <p className="text-gray-500">{user?.email}</p>
                    <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        {user?.role === 'admin' ? 'Administrator' : 'Verified Farmer'}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {languages.find(l => l.code === user?.preferredLanguage)?.label}
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setIsEditing(!isEditing)}
                    variant={isEditing ? 'default' : 'outline'}
                  >
                    {isEditing ? (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trust Score Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Trust score is calculated from rating quality, booking completion reliability, and review history.
                </p>

                <div className="space-y-3">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>Rating Quality (70% weight)</span>
                      <span className="font-medium">{socialStats?.trustBreakdown?.ratingScore ?? 0}%</span>
                    </div>
                    <Progress value={socialStats?.trustBreakdown?.ratingScore ?? 0} />
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>Booking Completion (20% weight)</span>
                      <span className="font-medium">{socialStats?.trustBreakdown?.completionScore ?? 0}%</span>
                    </div>
                    <Progress value={socialStats?.trustBreakdown?.completionScore ?? 0} />
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>Review Volume (10% weight)</span>
                      <span className="font-medium">{socialStats?.trustBreakdown?.reviewVolumeScore ?? 0}%</span>
                    </div>
                    <Progress value={socialStats?.trustBreakdown?.reviewVolumeScore ?? 0} />
                  </div>
                </div>

                <div className="rounded-md border bg-gray-50 p-3 text-sm text-gray-700">
                  Completed bookings: {socialStats?.trustBreakdown?.completedBookings ?? 0} / {socialStats?.trustBreakdown?.totalBookings ?? 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="name"
                        value={editedUser?.name || ''}
                        onChange={(e) => setEditedUser({ ...editedUser!, name: e.target.value })}
                        disabled={!isEditing}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={editedUser?.email || ''}
                        onChange={(e) => setEditedUser({ ...editedUser!, email: e.target.value })}
                        disabled={!isEditing}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="phone"
                        value={editedUser?.phone || ''}
                        onChange={(e) => setEditedUser({ ...editedUser!, phone: e.target.value })}
                        disabled={!isEditing}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="location"
                        value={editedUser?.location?.address || ''}
                        onChange={(e) => setEditedUser({ 
                          ...editedUser!, 
                          location: { ...editedUser?.location!, address: e.target.value }
                        })}
                        disabled={!isEditing}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
                {isEditing && (
                  <Button onClick={handleSave} className="w-full bg-gradient-to-r from-green-600 to-emerald-600">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kisan Verification (Aadhaar / DigiLocker)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border bg-gray-50 p-3 text-sm">
                  Current status:{' '}
                  <span className="font-semibold capitalize">{verificationState?.verificationStatus || user?.verificationStatus || 'unverified'}</span>
                  {verificationState?.verificationMethod && (
                    <span className="ml-2 text-gray-600">via {verificationState.verificationMethod}</span>
                  )}
                  {verificationState?.verificationRejectionReason && (
                    <p className="mt-2 text-red-600">Reason: {verificationState.verificationRejectionReason}</p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant={verificationMethod === 'aadhaar' ? 'default' : 'outline'}
                    onClick={() => setVerificationMethod('aadhaar')}
                  >
                    Verify with Aadhaar
                  </Button>
                  <Button
                    type="button"
                    variant={verificationMethod === 'digilocker' ? 'default' : 'outline'}
                    onClick={() => setVerificationMethod('digilocker')}
                  >
                    Verify with DigiLocker
                  </Button>
                </div>

                {verificationMethod === 'aadhaar' ? (
                  <Input
                    placeholder="Enter 12-digit Aadhaar number"
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    maxLength={12}
                  />
                ) : (
                  <p className="text-sm text-gray-600">
                    DigiLocker verification will mark your profile as pending and admin can approve after review.
                  </p>
                )}

                <Button onClick={handleSubmitVerification} disabled={verificationLoading} className="w-full">
                  {verificationLoading ? 'Submitting...' : 'Submit Verification'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                {recentReviews.length > 0 ? (
                  <div className="space-y-4">
                    {recentReviews.slice(0, 5).map((review) => (
                      <div key={review._id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{review.reviewerId?.username || 'Farmer'}</p>
                          <Badge className="bg-green-100 text-green-700">{review.rating}/5</Badge>
                        </div>
                        {review.comment ? (
                          <p className="mt-2 text-sm text-gray-600">{review.comment}</p>
                        ) : (
                          <p className="mt-2 text-sm text-gray-500">No written feedback</p>
                        )}
                        <p className="mt-2 text-xs text-gray-400">{new Date(review.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No reviews yet. Complete bookings to build trust.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Farm Details Tab */}
          <TabsContent value="farm" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tractor className="w-5 h-5 text-green-600" />
                  Farm Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="farmName">Farm Name</Label>
                    <Input
                      id="farmName"
                      value={editedUser?.farmDetails?.farmName || ''}
                      onChange={(e) => setEditedUser({
                        ...editedUser!,
                        farmDetails: { ...editedUser?.farmDetails!, farmName: e.target.value }
                      })}
                      disabled={!isEditing}
                      placeholder="Enter farm name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="farmSize">Farm Size (acres)</Label>
                    <Input
                      id="farmSize"
                      type="number"
                      value={editedUser?.farmDetails?.farmSize || ''}
                      onChange={(e) => setEditedUser({
                        ...editedUser!,
                        farmDetails: { ...editedUser?.farmDetails!, farmSize: parseFloat(e.target.value) }
                      })}
                      disabled={!isEditing}
                      placeholder="Enter farm size"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="soilType">Soil Type</Label>
                    <Select 
                      value={editedUser?.farmDetails?.soilType}
                      onValueChange={(value) => setEditedUser({
                        ...editedUser!,
                        farmDetails: { ...editedUser?.farmDetails!, soilType: value }
                      })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select soil type" />
                      </SelectTrigger>
                      <SelectContent>
                        {soilTypes.map(type => (
                          <SelectItem key={type} value={type.toLowerCase()}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="crops">Primary Crops</Label>
                    <Input
                      id="crops"
                      value={editedUser?.farmDetails?.crops?.join(', ') || ''}
                      onChange={(e) => setEditedUser({
                        ...editedUser!,
                        farmDetails: { 
                          ...editedUser?.farmDetails!, 
                          crops: e.target.value.split(',').map(c => c.trim()) 
                        }
                      })}
                      disabled={!isEditing}
                      placeholder="Wheat, Rice, Sugarcane"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sprout className="w-5 h-5 text-green-600" />
                  Current Crops
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-4">
                  {user?.farmDetails?.crops?.map((crop, idx) => (
                    <div key={idx} className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Sprout className="w-5 h-5 text-green-600" />
                        <span className="font-medium">{crop}</span>
                      </div>
                    </div>
                  )) || (
                    <p className="text-gray-500 col-span-3 text-center py-4">
                      No crops added yet. Edit your profile to add crops.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-600" />
                  Language Preferences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Preferred Language</Label>
                  <Select 
                    value={user?.preferredLanguage}
                    onValueChange={(value) => updateProfile({ preferredLanguage: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map(lang => (
                        <SelectItem key={lang.code} value={lang.code}>{lang.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-purple-600" />
                  Notification Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-500">Receive updates via email</p>
                  </div>
                  <Switch 
                    checked={notifications.email}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-gray-500">Receive push notifications</p>
                  </div>
                  <Switch 
                    checked={notifications.push}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">SMS Notifications</p>
                    <p className="text-sm text-gray-500">Receive updates via SMS</p>
                  </div>
                  <Switch 
                    checked={notifications.sms}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, sms: checked })}
                  />
                </div>
                <div className="border-t pt-4">
                  <p className="font-medium mb-3">Alert Types</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm">Market Price Alerts</p>
                      <Switch 
                        checked={notifications.marketAlerts}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, marketAlerts: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm">Government Scheme Alerts</p>
                      <Switch 
                        checked={notifications.schemeAlerts}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, schemeAlerts: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm">Weather Alerts</p>
                      <Switch 
                        checked={notifications.weatherAlerts}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, weatherAlerts: checked })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <LogOut className="w-5 h-5" />
                  Account Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
