import { useState, useEffect, useRef } from 'react';
import {
  Wrench,
  Search,
  Filter,
  MapPin,
  Star,
  Calendar,
  Phone,
  MessageCircle,
  Plus,
  Tractor,
  Sprout,
  Droplets,
  Shovel,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  X,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToolsStore } from '../stores/toolsStore';
import { useAuthStore } from '../stores/authStore';
import { PaymentModal } from '@/components/PaymentModal';
import { useChatStore } from '../stores/chatStore';
import { useLanguageStore } from '../stores/languageStore';
import { createBackendBooking, createBackendListing } from '../services/socialFeatureService';
import { isMongoObjectId } from '../services/apiClient';

export function ToolsLending({ onNavigateToChat }: { onNavigateToChat?: (ownerId: string) => void }) {
  const { t } = useLanguageStore();
  const [activeTab, setActiveTab] = useState('tools');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAddToolDialogOpen, setIsAddToolDialogOpen] = useState(false);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [isLandInquiryDialogOpen, setIsLandInquiryDialogOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<any>(null);
  const [selectedLand, setSelectedLand] = useState<any>(null);
  const [bookingDates, setBookingDates] = useState({ start: '', end: '' });
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const toolCategories = [
    { id: 'all', label: t('tools.allTools'), icon: Wrench },
    { id: 'tractor', label: t('tools.tractors'), icon: Tractor },
    { id: 'tiller', label: t('tools.tillers'), icon: Shovel },
    { id: 'sprayer', label: t('tools.sprayers'), icon: Droplets },
    { id: 'harvester', label: t('tools.harvesters'), icon: Sprout },
    { id: 'other', label: t('tools.other'), icon: HelpCircle },
  ];

  const {
    tools,
    landListings,
    bookingRequests,
    fetchTools,
    fetchLandListings,
    requestBooking,
    updateBooking,
    addTool,
    addLandListing
  } = useToolsStore();

  const { isAuthenticated, user } = useAuthStore();
  const { sendBookingRequest, chats } = useChatStore();

  const [newTool, setNewTool] = useState({
    name: '',
    category: '',
    location: '',
    dailyRate: '' as any,
    securityDeposit: '' as any,
    description: '',
    image: null as string | null
  });

  const [newLand, setNewLand] = useState({
    title: '',
    size: '' as any,
    soilType: '',
    location: '',
    monthlyRent: '' as any,
    facilities: '',
    image: null as string | null
  });

  useEffect(() => {
    fetchTools();
    fetchLandListings();
  }, [fetchTools, fetchLandListings]);

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tool.category.toLowerCase() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleBookTool = (tool: any) => {
    if (!isAuthenticated) {
      alert('Please login to book tools');
      return;
    }
    setSelectedTool(tool);
    setIsBookingDialogOpen(true);
  };

  const handleBookingSubmit = async () => {
    if (selectedTool && bookingDates.start && bookingDates.end) {
      const start = new Date(bookingDates.start);
      const end = new Date(bookingDates.end);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const totalAmount = days * selectedTool.dailyRate;

      const bookingData = {
        id: `${Date.now()}`,
        toolId: selectedTool.id,
        toolName: selectedTool.name,
        borrowerId: user?.id || '1',
        borrowerName: user?.name || 'Guest',
        lenderId: selectedTool.ownerId,
        startDate: bookingDates.start,
        endDate: bookingDates.end,
        totalAmount,
        securityDeposit: selectedTool.securityDeposit,
        status: 'pending' as const
      };

      requestBooking(bookingData);

      if (isMongoObjectId(selectedTool.id)) {
        try {
          await createBackendBooking({
            listingId: selectedTool.id,
            startDate: bookingDates.start,
            endDate: bookingDates.end,
            quantity: 1,
            notes: `Tool booking request for ${selectedTool.name}`,
          });
        } catch (error) {
          alert('Local booking created, but backend booking sync failed.');
        }
      }

      const ownerChat = chats.find(chat =>
        chat.type === 'direct' &&
        chat.participants.some(p => p.id === selectedTool.ownerId)
      );

      if (ownerChat) {
        sendBookingRequest(ownerChat.id, bookingData);
      }

      setIsBookingDialogOpen(false);
      setBookingDates({ start: '', end: '' });
      alert('Booking request sent! Opening chat with owner...');

      if (onNavigateToChat) {
        onNavigateToChat(selectedTool.ownerId);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'tool' | 'land') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'tool') {
          setNewTool({ ...newTool, image: reader.result as string });
        } else {
          setNewLand({ ...newLand, image: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTool = async () => {
    if (!newTool.name || !newTool.category || !newTool.dailyRate) {
      alert('Please fill in all required fields');
      return;
    }

    let backendListingId: string | undefined;
    try {
      const response = await createBackendListing({
        category: 'tool',
        title: newTool.name,
        description: newTool.description,
        location: newTool.location || 'India',
        pricePerUnit: Number(newTool.dailyRate),
        unit: 'day',
        quantity: 1,
        media: newTool.image ? [newTool.image] : [],
        metadata: {
          category: newTool.category,
          securityDeposit: Number(newTool.securityDeposit) || 0,
        },
      });
      backendListingId = response.listing._id;
    } catch (error) {
      alert('Created local tool listing, but backend sync failed.');
    }

    addTool({
      id: backendListingId as any,
      ...newTool,
      ownerId: user?.id || '1',
      ownerName: user?.name || 'Guest',
      ownerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rajesh',
      ownerRating: 5.0,
      images: newTool.image ? [newTool.image] : ['https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=400'],
      dailyRate: Number(newTool.dailyRate),
      securityDeposit: Number(newTool.securityDeposit) || 0,
      condition: 'good',
      availability: [],
      specifications: {},
      rating: 0,
      reviewCount: 0
    });

    setIsAddToolDialogOpen(false);
    setNewTool({
      name: '',
      category: '',
      location: '',
      dailyRate: '',
      securityDeposit: '',
      description: '',
      image: null
    });
    alert('Tool listed successfully!');
  };

  const handleAddLand = async () => {
    if (!newLand.title || !newLand.size || !newLand.monthlyRent) {
      alert('Please fill in all required fields');
      return;
    }

    let backendListingId: string | undefined;
    try {
      const response = await createBackendListing({
        category: 'land',
        title: newLand.title,
        description: 'Farmland available for lease',
        location: newLand.location || 'India',
        pricePerUnit: Number(newLand.monthlyRent),
        unit: 'month',
        quantity: Number(newLand.size),
        media: newLand.image ? [newLand.image] : [],
        metadata: {
          soilType: newLand.soilType,
          facilities: newLand.facilities,
        },
      });
      backendListingId = response.listing._id;
    } catch (error) {
      alert('Created local land listing, but backend sync failed.');
    }

    addLandListing({
      id: backendListingId as any,
      ...newLand,
      ownerId: user?.id || '1',
      ownerName: user?.name || 'Guest',
      description: 'Newly listed land',
      images: newLand.image ? [newLand.image] : ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400'],
      size: Number(newLand.size),
      sizeUnit: 'acres',
      monthlyRent: Number(newLand.monthlyRent),
      minLeasePeriod: 6,
      maxLeasePeriod: 12,
      facilities: newLand.facilities.split(',').map(f => f.trim()),
      waterSource: 'Not specified',
      isFenced: false,
      availability: [],
      rating: 0
    });

    setIsAddToolDialogOpen(false);
    setNewLand({
      title: '',
      size: '',
      soilType: '',
      location: '',
      monthlyRent: '',
      facilities: '',
      image: null
    });
    alert('Land listed successfully!');
  };

  const handleInquireLand = (land: any) => {
    if (!isAuthenticated) {
      alert('Please login to inquire about land');
      return;
    }
    setSelectedLand(land);
    setIsLandInquiryDialogOpen(true);
  };

  const handleLandInquirySubmit = async () => {
    if (selectedLand) {
      const bookingData = {
        id: `${Date.now()}`,
        toolId: selectedLand.id,
        toolName: selectedLand.title,
        borrowerId: user?.id || '1',
        borrowerName: user?.name || 'Guest',
        lenderId: selectedLand.ownerId,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        totalAmount: selectedLand.monthlyRent,
        securityDeposit: 0,
        status: 'pending' as const
      };

      requestBooking(bookingData);

      if (isMongoObjectId(selectedLand.id)) {
        try {
          await createBackendBooking({
            listingId: selectedLand.id,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            quantity: 1,
            notes: `Land inquiry for ${selectedLand.title}`,
          });
        } catch (error) {
          alert('Local inquiry created, but backend booking sync failed.');
        }
      }

      const ownerChat = chats.find(chat =>
        chat.type === 'direct' &&
        chat.participants.some(p => p.id === selectedLand.ownerId)
      );

      if (ownerChat) {
        sendBookingRequest(ownerChat.id, bookingData);
      }

      setIsLandInquiryDialogOpen(false);
      alert('Inquiry sent! Opening chat with land owner...');

      if (onNavigateToChat) {
        onNavigateToChat(selectedLand.ownerId);
      }
    }
  };

  const getConditionBadge = (condition: string) => {
    const variants: Record<string, string> = {
      new: 'bg-green-100 text-green-700',
      excellent: 'bg-blue-100 text-blue-700',
      good: 'bg-yellow-100 text-yellow-700',
      fair: 'bg-orange-100 text-orange-700'
    };
    return variants[condition] || variants.good;
  };

  const handlePayBooking = (booking: any) => {
    setSelectedBooking(booking);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    if (selectedBooking) {
      updateBooking(selectedBooking.id, { paymentStatus: 'completed', status: 'active' });
      setIsPaymentModalOpen(false);
      alert('Payment successful! Booking is now active.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Wrench className="w-8 h-8 text-green-600" />
            {t('tools.toolsLand')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('tools.rentFarm')}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="tools">{t('tools.farmTools')}</TabsTrigger>
              <TabsTrigger value="land">{t('tools.farmland')}</TabsTrigger>
              <TabsTrigger value="my-bookings">{t('tools.myBookings')}</TabsTrigger>
            </TabsList>
            <Button
              onClick={() => setIsAddToolDialogOpen(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('tools.listYour')}
            </Button>
          </div>

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={t('tools.searchTools')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder={t('tools.category')} />
                </SelectTrigger>
                <SelectContent>
                  {toolCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              {toolCategories.map(cat => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === cat.id
                      ? 'bg-green-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTools.map((tool) => (
                <Card key={tool.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative h-48">
                    <img
                      src={tool.images[0]}
                      alt={tool.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3">
                      <Badge className={getConditionBadge(tool.condition)}>
                        {t(`tools.${tool.condition}`) || tool.condition}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-1">{tool.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <MapPin className="w-4 h-4" />
                      {tool.location}
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">{t('tools.dailyRate')}</p>
                        <p className="font-semibold text-green-600">₹{tool.dailyRate}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('tools.security')}</p>
                        <p className="font-semibold">₹{tool.securityDeposit}</p>
                      </div>
                    </div>

                    <Button
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                      onClick={() => handleBookTool(tool)}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      {t('tools.bookNow')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Land Tab */}
          <TabsContent value="land" className="space-y-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {landListings.map((land) => (
                <Card key={land.id} className="overflow-hidden">
                  <div className="relative h-48">
                    <img src={land.images[0]} alt={land.title} className="w-full h-full object-cover" />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-1">{land.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <MapPin className="w-4 h-4" />
                      {land.location}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">{t('tools.size')}</p>
                        <p className="font-medium">{land.size} acres</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('tools.monthlyRent')}</p>
                        <p className="font-semibold text-green-600">₹{land.monthlyRent}</p>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                      onClick={() => handleInquireLand(land)}
                    >
                      {t('tools.inquireNow')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* My Bookings Tab */}
          <TabsContent value="my-bookings" className="space-y-6">
            <div className="grid gap-4">
              {bookingRequests.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">{booking.toolName}</h3>
                        <p className="text-sm text-gray-500">
                          {t('tools.total')}: ₹{booking.totalAmount}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{booking.status}</Badge>
                        {booking.status === 'approved' && booking.paymentStatus !== 'completed' && (
                          <Button size="sm" onClick={() => handlePayBooking(booking)}>
                            {t('tools.payNow')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {bookingRequests.length === 0 && (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-gray-600">{t('tools.noBookings')}</h3>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('tools.bookNow')} - {selectedTool?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input type="date" value={bookingDates.start} onChange={(e) => setBookingDates({ ...bookingDates, start: e.target.value })} />
                <Input type="date" value={bookingDates.end} onChange={(e) => setBookingDates({ ...bookingDates, end: e.target.value })} />
              </div>
              <Button className="w-full" onClick={handleBookingSubmit}>{t('tools.confirmBooking')}</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isLandInquiryDialogOpen} onOpenChange={setIsLandInquiryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('tools.inquireNow')} - {selectedLand?.title}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-500">{t('tools.noteInquiry')}</p>
            <Button className="w-full" onClick={handleLandInquirySubmit}>{t('tools.sendInquiry')}</Button>
          </DialogContent>
        </Dialog>

        <Dialog open={isAddToolDialogOpen} onOpenChange={setIsAddToolDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('tools.listYour')}</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="tool">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="tool">{t('tools.farmTools')}</TabsTrigger>
                <TabsTrigger value="land">{t('tools.farmland')}</TabsTrigger>
              </TabsList>
              <TabsContent value="tool" className="space-y-4 mt-4">
                <Input placeholder={t('tools.toolName')} value={newTool.name} onChange={(e) => setNewTool({ ...newTool, name: e.target.value })} />
                <Input placeholder={t('tools.dailyRate')} type="number" value={newTool.dailyRate} onChange={(e) => setNewTool({ ...newTool, dailyRate: e.target.value })} />
                <Button className="w-full" onClick={handleAddTool}>{t('tools.createListing')}</Button>
              </TabsContent>
              <TabsContent value="land" className="space-y-4 mt-4">
                <Input placeholder={t('tools.landTitle')} value={newLand.title} onChange={(e) => setNewLand({ ...newLand, title: e.target.value })} />
                <Input placeholder={t('tools.monthlyRent')} type="number" value={newLand.monthlyRent} onChange={(e) => setNewLand({ ...newLand, monthlyRent: e.target.value })} />
                <Button className="w-full" onClick={handleAddLand}>{t('tools.createListing')}</Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {isPaymentModalOpen && selectedBooking && (
          <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            amount={selectedBooking.totalAmount + (selectedBooking.securityDeposit || 0)}
            onSuccess={handlePaymentSuccess}
            payeeName={selectedBooking.lenderName || 'Owner'}
            title={`${t('tools.payNow')} - ${selectedBooking.toolName}`}
          />
        )}
      </div>
    </div>
  );
}
