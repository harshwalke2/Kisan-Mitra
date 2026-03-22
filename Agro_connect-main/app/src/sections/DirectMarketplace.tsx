import { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Search,
  Filter,
  MapPin,
  Star,
  Heart,
  Leaf,
  IndianRupee,
  Phone,
  MessageCircle,
  Plus,
  TrendingUp,
  CheckCircle,
  Package,
  Upload,
  X,
  Loader2,
  Pencil,
  Trash2,
  Navigation,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useMarketStore } from '../stores/marketStore';
import { useAuthStore } from '../stores/authStore';
import { PaymentModal } from '@/components/PaymentModal';
import { Cart } from './Cart';
import { useLanguageStore } from '../stores/languageStore';
import { createBackendBooking, createBackendListing, fetchBookingAvailability, uploadListingImage } from '../services/socialFeatureService';
import { isMongoObjectId } from '../services/apiClient';

const categories = ['All', 'Grains', 'Vegetables', 'Fruits', 'Pulses', 'Spices'];

const toBackendCategory = (value: string): string => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'grains') return 'grain';
  if (normalized === 'vegetables') return 'vegetable';
  if (normalized === 'fruits') return 'fruit';
  if (normalized === 'pulses') return 'pulse';
  if (normalized === 'spices') return 'spice';
  return normalized || 'other';
};

interface DirectMarketplaceProps {
  onNavigateToChat?: (ownerId: string) => void;
}

export function DirectMarketplace({ onNavigateToChat }: DirectMarketplaceProps) {
  const { t } = useLanguageStore();
  const [activeTab, setActiveTab] = useState('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isAddListingDialogOpen, setIsAddListingDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isAddToCartDialogOpen, setIsAddToCartDialogOpen] = useState(false);
  const [isProductDetailDialogOpen, setIsProductDetailDialogOpen] = useState(false);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [cartQuantity, setCartQuantity] = useState(1);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [showOrganicOnly, setShowOrganicOnly] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('0');
  const [sortBy, setSortBy] = useState<'newest' | 'priceAsc' | 'priceDesc' | 'ratingDesc'>('newest');

  const {
    listings,
    userListings,
    wishlist,
    cart,
    listingsStatus,
    listingsError,
    page,
    totalPages,
    fetchListings,
    fetchMyListings,
    setPage,
    addToWishlist,
    removeFromWishlist,
    addListing,
    addToCart,
    updateListing,
    deleteListing,
    markListingAsSold,
  } = useMarketStore();
  const { isAuthenticated, user } = useAuthStore();

  const handleAddToCartClick = (listing: any) => {
    if (!isAuthenticated) {
      alert('Please login to buy crops');
      return;
    }
    setSelectedListing(listing);
    setCartQuantity(listing.minOrderQuantity || 1);
    setIsAddToCartDialogOpen(true);
  };

  const handleConfirmAddToCart = () => {
    if (selectedListing) {
      if (cartQuantity > selectedListing.quantity) {
        alert(`Only ${selectedListing.quantity} ${selectedListing.quantityUnit} available`);
        return;
      }
      addToCart(selectedListing, cartQuantity);
      setIsAddToCartDialogOpen(false);
      alert('Added to cart!');
    }
  };

  const [newListing, setNewListing] = useState({
    cropName: '',
    variety: '',
    category: '',
    pricePerUnit: undefined as number | undefined,
    quantityUnit: 'kg',
    quantity: undefined as number | undefined,
    minOrderQuantity: undefined as number | undefined,
    location: '',
    isOrganic: false,
    description: '',
    image: null as string | null
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (isAuthenticated) {
        void uploadListingImage(file)
          .then((payload) => {
            setNewListing((prev) => ({ ...prev, image: payload.imageUrl }));
          })
          .catch(() => {
            const reader = new FileReader();
            reader.onloadend = () => {
              setNewListing((prev) => ({ ...prev, image: reader.result as string }));
            };
            reader.readAsDataURL(file);
          });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setNewListing({ ...newListing, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddListing = async () => {
    if (!newListing.cropName || !newListing.pricePerUnit || !newListing.quantity) {
      alert('Please fill in required fields');
      return;
    }

    if (editingListingId) {
      await updateListing(editingListingId, {
        cropName: newListing.cropName,
        category: toBackendCategory(newListing.category),
        variety: newListing.variety,
        pricePerUnit: Number(newListing.pricePerUnit || 0),
        quantityUnit: newListing.quantityUnit,
        quantity: Number(newListing.quantity || 0),
        minOrderQuantity: Number(newListing.minOrderQuantity || 1),
        location: newListing.location,
        isOrganic: newListing.isOrganic,
        description: newListing.description,
        images: newListing.image ? [newListing.image] : undefined,
      });

      setEditingListingId(null);
      setIsAddListingDialogOpen(false);
      setNewListing({
        cropName: '',
        variety: '',
        category: '',
        pricePerUnit: undefined,
        quantityUnit: 'kg',
        quantity: undefined,
        minOrderQuantity: undefined,
        location: '',
        isOrganic: false,
        description: '',
        image: null,
      });
      alert('Listing updated successfully!');
      return;
    }

    let backendListingId: string | undefined;
    try {
      const response = await createBackendListing({
        category: toBackendCategory(newListing.category) as any,
        productName: newListing.cropName,
        title: newListing.cropName,
        description: newListing.description,
        location: newListing.location || 'India',
        price: newListing.pricePerUnit,
        pricePerUnit: newListing.pricePerUnit,
        unit: newListing.quantityUnit,
        quantity: newListing.quantity,
        image: newListing.image || undefined,
        media: newListing.image ? [newListing.image] : [],
        metadata: {
          variety: newListing.variety,
          category: newListing.category,
          isOrganic: newListing.isOrganic,
          minOrderQuantity: newListing.minOrderQuantity || 1,
        },
      });
      backendListingId = response.listing._id;
    } catch (error) {
      alert('Created local listing, but backend sync failed. You can still continue testing.');
    }

    addListing({
      id: backendListingId as any,
      farmerId: user?.id || '1',
      farmerName: user?.name || 'Guest',
      farmerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rajesh',
      cropName: newListing.cropName,
      category: toBackendCategory(newListing.category),
      variety: newListing.variety,
      quantity: newListing.quantity,
      quantityUnit: newListing.quantityUnit,
      pricePerUnit: newListing.pricePerUnit,
      minOrderQuantity: newListing.minOrderQuantity || 1,
      quality: 'Standard',
      isOrganic: newListing.isOrganic,
      harvestDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      images: newListing.image ? [newListing.image] : ['https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400'],
      description: newListing.description,
      location: newListing.location,
      rating: 0,
      reviewCount: 0,
      status: 'active'
    });

    setIsAddListingDialogOpen(false);
    setNewListing({
      cropName: '',
      variety: '',
      category: '',
      pricePerUnit: undefined,
      quantityUnit: 'kg',
      quantity: undefined,
      minOrderQuantity: undefined,
      location: '',
      isOrganic: false,
      description: '',
      image: null
    });
    alert('Listing created successfully!');
  };

  const handleRequestDeal = async (listing: any) => {
    if (!isAuthenticated) {
      alert('Please login to request a deal');
      return;
    }

    if (!isMongoObjectId(listing.id)) {
      return;
    }

    try {
      await createBackendBooking({
        listingId: listing.id,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        quantity: listing.minOrderQuantity || 1,
        notes: 'Auto-created from direct marketplace chat flow',
      });
    } catch (error) {
      // Keep UX non-blocking because users can still negotiate in chat.
    }
  };

  useEffect(() => {
    const preferredCrop = localStorage.getItem('marketPreferredCrop');
    if (preferredCrop) {
      setSearchQuery(preferredCrop);
      localStorage.removeItem('marketPreferredCrop');
    }
  }, []);

  useEffect(() => {
    void fetchListings({
      cropName: searchQuery,
      location: searchQuery,
      isOrganic: showOrganicOnly ? true : undefined,
      minPrice: Number(minPrice || 0),
      maxPrice: Number(maxPrice || 0),
      minRating: Number(minRating || 0),
      sortBy,
      category: selectedCategory === 'All' ? undefined : toBackendCategory(selectedCategory),
      page,
      limit: 12,
    });
  }, [
    fetchListings,
    searchQuery,
    selectedCategory,
    showOrganicOnly,
    minPrice,
    maxPrice,
    minRating,
    sortBy,
    page,
  ]);

  useEffect(() => {
    if (activeTab !== 'browse') {
      return;
    }

    void fetchListings({
      cropName: searchQuery,
      location: searchQuery,
      isOrganic: showOrganicOnly ? true : undefined,
      minPrice: Number(minPrice || 0),
      maxPrice: Number(maxPrice || 0),
      minRating: Number(minRating || 0),
      sortBy,
    });

    const timer = setInterval(() => {
      void fetchListings({ page, limit: 12 });
    }, 30000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void fetchListings({
          cropName: searchQuery,
          location: searchQuery,
          isOrganic: showOrganicOnly ? true : undefined,
          minPrice: Number(minPrice || 0),
          maxPrice: Number(maxPrice || 0),
          minRating: Number(minRating || 0),
          sortBy,
          category: selectedCategory === 'All' ? undefined : toBackendCategory(selectedCategory),
          page,
          limit: 12,
        });
      }
    };

    const handleFocus = () => {
      void fetchListings({
        cropName: searchQuery,
        location: searchQuery,
        isOrganic: showOrganicOnly ? true : undefined,
        minPrice: Number(minPrice || 0),
        maxPrice: Number(maxPrice || 0),
        minRating: Number(minRating || 0),
        sortBy,
        category: selectedCategory === 'All' ? undefined : toBackendCategory(selectedCategory),
        page,
        limit: 12,
      });
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    void fetchMyListings();

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [activeTab, fetchListings, fetchMyListings, searchQuery, selectedCategory, showOrganicOnly, minPrice, maxPrice, minRating, sortBy, page]);

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.cropName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All'
      || String(listing.category || '').toLowerCase() === selectedCategory.toLowerCase();
    const matchesOrganic = !showOrganicOnly || listing.isOrganic;
    return matchesSearch && matchesCategory && matchesOrganic;
  });

  const handleContact = (listing: any) => {
    if (!isAuthenticated) {
      alert('Please login to contact sellers');
      return;
    }
    setSelectedListing(listing);
    setIsContactDialogOpen(true);
  };

  const handleCheckAvailability = async (listing: any) => {
    if (!isAuthenticated) {
      alert('Please login to check availability');
      return;
    }

    if (!isMongoObjectId(listing.id)) {
      alert('Availability is available for synced backend listings only.');
      return;
    }

    try {
      const data = await fetchBookingAvailability(listing.id);
      if (!data.unavailableRanges.length) {
        alert('This listing is currently available for your preferred dates.');
        return;
      }

      const preview = data.unavailableRanges
        .slice(0, 5)
        .map((range) => `${new Date(range.startDate).toLocaleDateString()} - ${new Date(range.endDate).toLocaleDateString()} (${range.status})`)
        .join('\n');
      alert(`Unavailable ranges:\n${preview}`);
    } catch (error) {
      alert('Unable to fetch availability right now. Please try again.');
    }
  };

  const toggleWishlist = (id: string) => {
    if (wishlist.includes(id)) {
      removeFromWishlist(id);
    } else {
      addToWishlist(id);
    }
  };

  const trendingCrops = listings.filter(l => l.rating >= 4.5).slice(0, 4);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-green-600" />
            Direct Crop Marketplace
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Buy and sell crops directly - no middlemen, better prices
          </p>
        </div>

        {/* Trending Section */}
        {activeTab === 'browse' && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-semibold">Trending Crops</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {trendingCrops.map((crop) => (
                <Card key={crop.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <img
                      src={crop.images[0]}
                      alt={crop.cropName}
                      className="w-full h-24 object-cover rounded-lg mb-2"
                    />
                    <h3 className="font-medium text-sm">{crop.cropName}</h3>
                    <p className="text-green-600 font-semibold">₹{crop.pricePerUnit}/{crop.quantityUnit}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {listingsStatus === 'error' && listingsError && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {listingsError}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="browse">Browse Crops</TabsTrigger>
              <TabsTrigger value="my-listings">My Listings</TabsTrigger>
              <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
              <TabsTrigger value="cart" className="relative">
                Cart
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            <Button
              onClick={() => setIsAddListingDialogOpen(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Sell Your Crop
            </Button>
          </div>

          {/* Browse Tab */}
          <TabsContent value="browse" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search crops or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg">
                <Leaf className="w-4 h-4 text-green-500" />
                <span className="text-sm">Organic Only</span>
                <Switch
                  checked={showOrganicOnly}
                  onCheckedChange={setShowOrganicOnly}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                type="number"
                min="0"
                placeholder="Min price"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <Input
                type="number"
                min="0"
                placeholder="Max price"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
              <Select value={minRating} onValueChange={setMinRating}>
                <SelectTrigger>
                  <SelectValue placeholder="Min rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any rating</SelectItem>
                  <SelectItem value="3">3+ stars</SelectItem>
                  <SelectItem value="4">4+ stars</SelectItem>
                  <SelectItem value="4.5">4.5+ stars</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="priceAsc">Price: Low to High</SelectItem>
                  <SelectItem value="priceDesc">Price: High to Low</SelectItem>
                  <SelectItem value="ratingDesc">Best Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === cat
                    ? 'bg-green-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Listings Grid */}
            {listingsStatus === 'loading' && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading products...
              </div>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredListings.map((listing) => (
                <Card key={listing.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative h-48 cursor-pointer" onClick={() => { setSelectedListing(listing); setIsProductDetailDialogOpen(true); }}>
                    <img
                      src={listing.images[0]}
                      alt={listing.cropName}
                      className="w-full h-full object-cover"
                    />
                    {listing.isOrganic && (
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
                          <Leaf className="w-3 h-3" />
                          Organic
                        </Badge>
                      </div>
                    )}
                    {listing.isBestDeal && (
                      <div className="absolute bottom-3 left-3">
                        <Badge className="bg-emerald-600 text-white">Best Deal</Badge>
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        {listing.rating}
                      </Badge>
                    </div>
                    <button
                      onClick={() => toggleWishlist(listing.id)}
                      className="absolute bottom-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md"
                    >
                      <Heart
                        className={`w-4 h-4 ${wishlist.includes(listing.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                      />
                    </button>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">{listing.cropName}</h3>
                      <Badge variant="outline">{listing.quality}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{listing.variety}</p>

                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <MapPin className="w-4 h-4" />
                      {listing.location}
                      {listing.distance && <span className="text-gray-400">({listing.distance} km)</span>}
                      {listing.nearby && (
                        <Badge variant="outline" className="ml-auto flex items-center gap-1">
                          <Navigation className="h-3 w-3" /> Nearby
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1 mb-3">
                      <IndianRupee className="w-4 h-4 text-green-600" />
                      <span className="text-xl font-bold text-green-600">{listing.pricePerUnit.toLocaleString()}</span>
                      <span className="text-gray-500">per {listing.quantityUnit}</span>
                    </div>

                    {listing.recommendedPrice && (
                      <p className="mb-2 text-xs text-gray-500">
                        Recommended: ₹{listing.recommendedPrice.toFixed(0)}/{listing.quantityUnit}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>Min Order: {listing.minOrderQuantity} {listing.quantityUnit}</span>
                      <span className="flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        {listing.quantity} {listing.quantityUnit} available
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <img
                        src={listing.farmerAvatar}
                        alt={listing.farmerName}
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium flex items-center gap-2">
                          {listing.farmerName}
                          {listing.isVerifiedSeller && (
                            <Badge className="bg-emerald-100 text-emerald-700">Verified Seller</Badge>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{listing.reviewCount} reviews</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                        onClick={() => handleAddToCartClick(listing)}
                      >
                        Add to Cart
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleContact(listing)}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Chat
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={() => handleCheckAvailability(listing)}>
                        Check dates
                      </Button>
                      <Button variant="outline" size="icon">
                        <Phone className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                Page {page} of {Math.max(1, totalPages)}
              </span>
              <Button
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </TabsContent>

          {/* My Listings Tab */}
          <TabsContent value="my-listings" className="space-y-6">
            {!isAuthenticated ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600">Please login to view your listings</h3>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {userListings.map((listing) => (
                  <Card key={listing.id} className="overflow-hidden">
                    <div className="relative h-48">
                      <img
                        src={listing.images[0]}
                        alt={listing.cropName}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 right-3">
                        <Badge className={
                          listing.status === 'active' ? 'bg-green-100 text-green-700' :
                            listing.status === 'sold' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                        }>
                          {listing.status}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg">{listing.cropName}</h3>
                      <p className="text-green-600 font-semibold">₹{listing.pricePerUnit}/{listing.quantityUnit}</p>
                      <p className="text-sm text-gray-500">{listing.quantity} {listing.quantityUnit} remaining</p>
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setEditingListingId(listing.id);
                            setNewListing({
                              cropName: listing.cropName,
                              variety: listing.variety,
                              category: listing.category || '',
                              pricePerUnit: listing.pricePerUnit,
                              quantityUnit: listing.quantityUnit,
                              quantity: listing.quantity,
                              minOrderQuantity: listing.minOrderQuantity,
                              location: listing.location,
                              isOrganic: listing.isOrganic,
                              description: listing.description,
                              image: listing.images[0] || null,
                            });
                            setIsAddListingDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />Edit
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => void markListingAsSold(listing.id)}
                        >
                          Mark Sold
                        </Button>
                        <Button
                          variant="destructive"
                          className="col-span-2"
                          onClick={() => void deleteListing(listing.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {userListings.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600">No listings yet</h3>
                    <p className="text-gray-400">Start selling your crops</p>
                    <Button
                      className="mt-4 bg-gradient-to-r from-green-600 to-emerald-600"
                      onClick={() => setIsAddListingDialogOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Listing
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Wishlist Tab */}
          <TabsContent value="wishlist" className="space-y-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.filter(l => wishlist.includes(l.id)).map((listing) => (
                <Card key={listing.id} className="overflow-hidden">
                  <div className="relative h-48">
                    <img
                      src={listing.images[0]}
                      alt={listing.cropName}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => toggleWishlist(listing.id)}
                      className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md"
                    >
                      <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                    </button>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg">{listing.cropName}</h3>
                    <p className="text-green-600 font-semibold">₹{listing.pricePerUnit}/{listing.quantityUnit}</p>
                    <Button
                      className="w-full mt-4 bg-gradient-to-r from-green-600 to-emerald-600"
                      onClick={() => handleContact(listing)}
                    >
                      Contact Seller
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {wishlist.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600">{t('market.wishlistEmpty')}</h3>
                  <p className="text-gray-400">{t('market.saveCropsInterest')}</p>
                </div>
              )}
            </div>
          </TabsContent>


          {/* Cart Tab */}
          <TabsContent value="cart">
            <Cart />
          </TabsContent>
        </Tabs>

        {/* Add Listing Dialog */}
        <Dialog open={isAddListingDialogOpen} onOpenChange={setIsAddListingDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('market.sellYourCrop')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-700 dark:border-gray-600">
                  {newListing.image ? (
                    <div className="relative w-full h-full">
                      <img src={newListing.image} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setNewListing({ ...newListing, image: null });
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-500" />
                      <p className="text-sm text-gray-500">{t('market.uploadCropImage')}</p>
                    </div>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder={t('market.cropNamePlaceholder')}
                  value={newListing.cropName}
                  onChange={(e) => setNewListing({ ...newListing, cropName: e.target.value })}
                />
                <Input
                  placeholder={t('market.varietyPlaceholder')}
                  value={newListing.variety}
                  onChange={(e) => setNewListing({ ...newListing, variety: e.target.value })}
                />
              </div>
              <Select
                value={newListing.category}
                onValueChange={(val) => setNewListing({ ...newListing, category: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('market.categoryPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter(c => c !== 'All').map(cat => (
                    <SelectItem key={cat} value={cat.toLowerCase()}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  placeholder={t('market.pricePerUnitPlaceholder')}
                  value={newListing.pricePerUnit || ''}
                  onChange={(e) => setNewListing({ ...newListing, pricePerUnit: Number(e.target.value) })}
                />
                <Select
                  value={newListing.quantityUnit}
                  onValueChange={(val) => setNewListing({ ...newListing, quantityUnit: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('market.unitPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">{t('market.perKg')}</SelectItem>
                    <SelectItem value="quintal">{t('market.perQuintal')}</SelectItem>
                    <SelectItem value="ton">{t('market.perTon')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  placeholder={t('market.totalQuantityPlaceholder')}
                  value={newListing.quantity || ''}
                  onChange={(e) => setNewListing({ ...newListing, quantity: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  placeholder={t('market.minOrderQuantityPlaceholder')}
                  value={newListing.minOrderQuantity || ''}
                  onChange={(e) => setNewListing({ ...newListing, minOrderQuantity: Number(e.target.value) })}
                />
              </div>
              <Input
                placeholder={t('market.locationPlaceholder')}
                value={newListing.location}
                onChange={(e) => setNewListing({ ...newListing, location: e.target.value })}
              />
              <div className="flex items-center gap-2">
                <Switch
                  id="organic"
                  checked={newListing.isOrganic}
                  onCheckedChange={(checked) => setNewListing({ ...newListing, isOrganic: checked })}
                />
                <label htmlFor="organic" className="text-sm">{t('market.organicProduceLabel')}</label>
              </div>
              <Input
                placeholder={t('market.descriptionPlaceholder')}
                value={newListing.description}
                onChange={(e) => setNewListing({ ...newListing, description: e.target.value })}
              />
              <Button
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                onClick={handleAddListing}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {editingListingId ? 'Update Listing' : t('market.createListingBtn')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isProductDetailDialogOpen} onOpenChange={setIsProductDetailDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{selectedListing?.cropName || 'Product details'}</DialogTitle>
            </DialogHeader>
            {selectedListing && (
              <div className="grid gap-4 md:grid-cols-2">
                <img
                  src={selectedListing.images?.[0]}
                  alt={selectedListing.cropName}
                  className="h-64 w-full rounded-lg object-cover"
                />
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Category: {selectedListing.category || 'other'}</p>
                  <p className="text-2xl font-bold text-green-600">₹{selectedListing.pricePerUnit}/{selectedListing.quantityUnit}</p>
                  {selectedListing.recommendedPrice && (
                    <p className="text-sm text-gray-500">Recommended price: ₹{Number(selectedListing.recommendedPrice).toFixed(0)}</p>
                  )}
                  <p className="text-sm text-gray-600">{selectedListing.description || 'No description provided.'}</p>
                  <p className="text-sm">Quantity: {selectedListing.quantity} {selectedListing.quantityUnit}</p>
                  <p className="text-sm">Location: {selectedListing.location}</p>
                  <p className="text-sm">Seller: {selectedListing.farmerName}</p>
                  <div className="pt-2">
                    <Button
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                      onClick={() => {
                        setIsProductDetailDialogOpen(false);
                        handleContact(selectedListing);
                      }}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" /> Contact Seller
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Contact Dialog */}
        <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('market.contactFarmer', { farmerName: selectedListing?.farmerName })}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <img
                  src={selectedListing?.farmerAvatar}
                  alt={selectedListing?.farmerName}
                  className="w-16 h-16 rounded-full"
                />
                <div>
                  <h3 className="font-semibold">{selectedListing?.farmerName}</h3>
                  <p className="text-sm text-gray-500">{selectedListing?.reviewCount} {t('market.reviews')}</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{selectedListing?.rating}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 className="font-medium mb-2">{selectedListing?.cropName}</h4>
                <p className="text-green-600 font-semibold">
                  ₹{selectedListing?.pricePerUnit}/{selectedListing?.quantityUnit}
                </p>
                <p className="text-sm text-gray-500">
                  {selectedListing?.quantity} {selectedListing?.quantityUnit} {t('market.available')}
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                  onClick={() => {
                    if (onNavigateToChat && selectedListing) {
                      void handleRequestDeal(selectedListing);
                      onNavigateToChat(selectedListing.farmerId);
                      setIsContactDialogOpen(false);
                    }
                  }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {t('market.startChat')}
                </Button>
                <Button variant="outline" className="w-full">
                  <Phone className="w-4 h-4 mr-2" />
                  {t('market.callFarmer')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {selectedListing && (
          <Dialog open={isAddToCartDialogOpen} onOpenChange={setIsAddToCartDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{t('market.addToCart')}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t('market.quantity')} ({selectedListing?.quantityUnit})</span>
                  <span className="text-sm text-gray-500">{t('market.available')}: {selectedListing?.quantity}</span>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCartQuantity(Math.max((selectedListing?.minOrderQuantity || 1), cartQuantity - 1))}
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    value={cartQuantity}
                    onChange={(e) => setCartQuantity(Number(e.target.value))}
                    className="text-center"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCartQuantity(Math.min(selectedListing?.quantity || 1000, cartQuantity + 1))}
                  >
                    +
                  </Button>
                </div>
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-md">
                  <span className="text-sm text-gray-600">{t('market.totalPrice')}:</span>
                  <span className="font-bold text-green-600">
                    ₹{((selectedListing?.pricePerUnit || 0) * cartQuantity).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsAddToCartDialogOpen(false)}>{t('market.cancel')}</Button>
                <Button onClick={handleConfirmAddToCart} className="bg-green-600 hover:bg-green-700">{t('market.confirmAdd')}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
