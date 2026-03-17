import { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Filter,
  MapPin,
  Calendar,
  CheckCircle,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  FileText,
  Users,
  AlertCircle,
  Bot,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useSchemesStore } from '../stores/schemesStore';
import { useAuthStore } from '../stores/authStore';
import { useLanguageStore } from '../stores/languageStore';

const states = [
  'All India',
  'Andhra Pradesh',
  'Bihar',
  'Gujarat',
  'Haryana',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'West Bengal'
];

const categories = [
  'All',
  'Income Support',
  'Credit Facility',
  'Insurance',
  'Soil Health',
  'Irrigation',
  'Organic Farming',
  'Loan Waiver',
  'Equipment Subsidy'
];

export function GovernmentSchemes() {
  const { t } = useLanguageStore();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('All India');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedScheme, setSelectedScheme] = useState<any>(null);
  const [isSchemeDialogOpen, setIsSchemeDialogOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ type: 'user' | 'bot', message: string }>>([
    { type: 'bot', message: 'Hello! I can help you find the right government scheme for your needs. What type of assistance are you looking for?' }
  ]);

  const { schemes, bookmarkedSchemes, myApplications, fetchSchemes, bookmarkScheme, removeBookmark } = useSchemesStore();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    fetchSchemes({
      state: selectedState,
      category: selectedCategory === 'All' ? undefined : selectedCategory,
      search: searchQuery
    });
  }, [selectedState, selectedCategory, searchQuery, fetchSchemes]);

  const filteredSchemes = schemes.filter(scheme => {
    const matchesSearch = scheme.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scheme.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesState = selectedState === 'All India' || scheme.state === 'All India' || scheme.state === selectedState;
    const matchesCategory = selectedCategory === 'All' || scheme.category === selectedCategory;
    return matchesSearch && matchesState && matchesCategory;
  });

  const handleSchemeClick = (scheme: any) => {
    setSelectedScheme(scheme);
    setIsSchemeDialogOpen(true);
  };

  const toggleBookmark = (id: string) => {
    if (bookmarkedSchemes.includes(id)) {
      removeBookmark(id);
    } else {
      bookmarkScheme(id);
    }
  };

  const handleChatSubmit = () => {
    if (chatMessage.trim()) {
      setChatHistory([...chatHistory, { type: 'user', message: chatMessage }]);

      // Simulate bot response
      setTimeout(() => {
        const responses = [
          'Based on your query, I recommend checking out PM-KISAN for income support.',
          'You might be eligible for Soil Health Card Scheme. Would you like more details?',
          'For equipment subsidies, look into SMAM (Sub-Mission on Agricultural Mechanization).',
          'I can help you find schemes specific to your state. Which state are you from?'
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        setChatHistory(prev => [...prev, { type: 'bot', message: randomResponse }]);
      }, 1000);

      setChatMessage('');
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Income Support': 'bg-blue-100 text-blue-700',
      'Credit Facility': 'bg-green-100 text-green-700',
      'Insurance': 'bg-purple-100 text-purple-700',
      'Soil Health': 'bg-amber-100 text-amber-700',
      'Irrigation': 'bg-cyan-100 text-cyan-700',
      'Organic Farming': 'bg-emerald-100 text-emerald-700',
      'Loan Waiver': 'bg-red-100 text-red-700',
      'Equipment Subsidy': 'bg-orange-100 text-orange-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Building2 className="w-8 h-8 text-green-600" />
            {t('schemes.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('schemes.subtitle')}
          </p>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{schemes.length}</p>
                <p className="text-sm text-gray-500">{t('schemes.total')}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{myApplications.length}</p>
                <p className="text-sm text-gray-500">{t('schemes.myApplications')}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <BookmarkCheck className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{bookmarkedSchemes.length}</p>
                <p className="text-sm text-gray-500">{t('schemes.bookmarked')}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">5Cr+</p>
                <p className="text-sm text-gray-500">{t('schemes.farmersBenefited')}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <TabsList>
              <TabsTrigger value="all">{t('schemes.allSchemes')}</TabsTrigger>
              <TabsTrigger value="bookmarked">{t('schemes.bookmarked')}</TabsTrigger>
              <TabsTrigger value="applications">{t('schemes.myApplications')}</TabsTrigger>
            </TabsList>
            <div className="flex-1" />
            <Button
              onClick={() => setIsChatbotOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              <Bot className="w-4 h-4 mr-2" />
              {t('schemes.assistant')}
            </Button>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder={t('schemes.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-full sm:w-48">
                <MapPin className="w-4 h-4 mr-2" />
                <SelectValue placeholder={t('schemes.state')} />
              </SelectTrigger>
              <SelectContent>
                {states.map(state => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder={t('schemes.category')} />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* All Schemes Tab */}
          <TabsContent value="all" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSchemes.map((scheme) => (
                <Card key={scheme.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative h-48">
                    <img
                      src={scheme.image}
                      alt={scheme.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3">
                      <Badge className={getCategoryColor(scheme.category)}>
                        {scheme.category}
                      </Badge>
                    </div>
                    <div className="absolute top-3 right-3">
                      <Badge variant={scheme.centralOrState === 'central' ? 'default' : 'secondary'}>
                        {scheme.centralOrState === 'central' ? t('schemes.central') : t('schemes.stateSmall')}
                      </Badge>
                    </div>
                    <button
                      onClick={() => toggleBookmark(scheme.id)}
                      className="absolute bottom-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md"
                    >
                      <Bookmark
                        className={`w-4 h-4 ${bookmarkedSchemes.includes(scheme.id) ? 'fill-blue-500 text-blue-500' : 'text-gray-400'}`}
                      />
                    </button>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">{scheme.title}</h3>
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{scheme.description}</p>

                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <MapPin className="w-4 h-4" />
                      {scheme.state}
                    </div>

                    {scheme.deadline && (
                      <div className="flex items-center gap-2 text-sm text-orange-600 mb-3">
                        <Calendar className="w-4 h-4" />
                        {t('schemes.deadline')}: {new Date(scheme.deadline).toLocaleDateString()}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600"
                        onClick={() => handleSchemeClick(scheme)}
                      >
                        {t('schemes.viewDetails')}
                      </Button>
                      <Button variant="outline" size="icon">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Bookmarked Tab */}
          <TabsContent value="bookmarked" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {schemes.filter(s => bookmarkedSchemes.includes(s.id)).map((scheme) => (
                <Card key={scheme.id} className="overflow-hidden">
                  <div className="relative h-48">
                    <img
                      src={scheme.image}
                      alt={scheme.title}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => toggleBookmark(scheme.id)}
                      className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md"
                    >
                      <Bookmark className="w-4 h-4 fill-blue-500 text-blue-500" />
                    </button>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{scheme.title}</h3>
                    <Button
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                      onClick={() => handleSchemeClick(scheme)}
                    >
                      {t('schemes.viewDetails')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {bookmarkedSchemes.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Bookmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600">{t('schemes.noBookmarks')}</h3>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-6">
            <div className="grid gap-4">
              {myApplications.map((app) => (
                <Card key={app.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${app.status === 'approved' ? 'bg-green-100' :
                            app.status === 'submitted' ? 'bg-blue-100' :
                              app.status === 'under-review' ? 'bg-yellow-100' :
                                'bg-red-100'
                          }`}>
                          <FileText className={`w-6 h-6 ${app.status === 'approved' ? 'text-green-600' :
                              app.status === 'submitted' ? 'text-blue-600' :
                                app.status === 'under-review' ? 'text-yellow-600' :
                                  'text-red-600'
                            }`} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{app.schemeName}</h3>
                          <p className="text-sm text-gray-500">
                            {new Date(app.submittedAt || '').toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge>{app.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {myApplications.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600">{t('schemes.noApplications')}</h3>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Scheme Detail Dialog */}
        <Dialog open={isSchemeDialogOpen} onOpenChange={setIsSchemeDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedScheme && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedScheme.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <img
                    src={selectedScheme.image}
                    alt={selectedScheme.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />

                  <div className="flex flex-wrap gap-2">
                    <Badge className={getCategoryColor(selectedScheme.category)}>
                      {selectedScheme.category}
                    </Badge>
                    <Badge variant={selectedScheme.centralOrState === 'central' ? 'default' : 'secondary'}>
                      {selectedScheme.centralOrState === 'central' ? t('schemes.centralScheme') : t('schemes.stateScheme')}
                    </Badge>
                  </div>

                  <p className="text-gray-600">{selectedScheme.description}</p>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="eligibility">
                      <AccordionTrigger>{t('schemes.eligibility')}</AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-2">
                          {selectedScheme.eligibility.map((item: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="benefits">
                      <AccordionTrigger>{t('schemes.benefits')}</AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-2">
                          {selectedScheme.benefits.map((item: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="documents">
                      <AccordionTrigger>{t('schemes.documents')}</AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-2">
                          {selectedScheme.documents.map((item: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <FileText className="w-4 h-4 text-blue-500 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="process">
                      <AccordionTrigger>{t('schemes.process')}</AccordionTrigger>
                      <AccordionContent>
                        <p>{selectedScheme.applicationProcess}</p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  <div className="flex gap-3">
                    <Button className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600">
                      {t('schemes.applyNow')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => toggleBookmark(selectedScheme.id)}
                    >
                      <Bookmark className={`${bookmarkedSchemes.includes(selectedScheme.id) ? 'fill-blue-500 text-blue-500' : ''}`} />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Chatbot Dialog */}
        <Dialog open={isChatbotOpen} onOpenChange={setIsChatbotOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-600" />
                {t('schemes.assistantTitle')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="h-80 overflow-y-auto space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                {chatHistory.map((chat, idx) => (
                  <div
                    key={idx}
                    className={`flex ${chat.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2 rounded-lg ${chat.type === 'user'
                          ? 'bg-green-500 text-white'
                          : 'bg-white dark:bg-gray-700 shadow-sm'
                        }`}
                    >
                      {chat.message}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={t('schemes.askAssistant')}
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                />
                <Button onClick={handleChatSubmit}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
