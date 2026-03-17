import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Filter,
  AlertCircle,
  Brain,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  LineChart as LineChartIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMarketStore } from '../stores/marketStore';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

import { useLanguageStore } from '../stores/languageStore';

export function MarketIntelligence() {
  const { t } = useLanguageStore();
  const [activeTab, setActiveTab] = useState('prices');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  const { cropPrices, insights, fetchCropPrices, getPricePrediction } = useMarketStore();

  useEffect(() => {
    fetchCropPrices();
  }, []);

  const filteredPrices = cropPrices.filter(crop =>
    crop.cropName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCropData = selectedCrop
    ? cropPrices.find(c => c.cropName === selectedCrop)
    : null;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      default:
        return <Minus className="w-5 h-5 text-gray-500" />;
    }
  };

  const getDemandBadge = (demand: string) => {
    const variants: Record<string, string> = {
      high: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-red-100 text-red-700'
    };
    return variants[demand] || variants.medium;
  };

  const pieData = cropPrices.map(crop => ({
    name: crop.cropName,
    value: crop.currentPrice,
    change: crop.priceChangePercent
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-600" />
            {t('market.intelHeader')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('market.intelSubtitle')}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 lg:w-fit">
            <TabsTrigger value="prices">{t('market.livePrices')}</TabsTrigger>
            <TabsTrigger value="trends">{t('market.trends')}</TabsTrigger>
            <TabsTrigger value="predictions">{t('market.predictions')}</TabsTrigger>
            <TabsTrigger value="insights">{t('market.insights')}</TabsTrigger>
          </TabsList>

          {/* Live Prices Tab */}
          <TabsContent value="prices" className="space-y-6">
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={t('market.searchCrops')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder={t('market.filterBy')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('market.allCrops')}</SelectItem>
                  <SelectItem value="high-demand">{t('market.highDemand')}</SelectItem>
                  <SelectItem value="price-up">{t('market.priceRising')}</SelectItem>
                  <SelectItem value="price-down">{t('market.priceFalling')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPrices.map((crop) => (
                <Card
                  key={crop.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${selectedCrop === crop.cropName ? 'ring-2 ring-green-500' : ''
                    }`}
                  onClick={() => setSelectedCrop(crop.cropName)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">{crop.cropName}</h3>
                      {getTrendIcon(crop.trend)}
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-2xl font-bold">₹{crop.currentPrice.toLocaleString()}</span>
                      <span className="text-sm text-gray-500">{crop.priceUnit}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      {crop.priceChange >= 0 ? (
                        <ArrowUpRight className="w-4 h-4 text-green-500" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-500" />
                      )}
                      <span className={crop.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {crop.priceChange >= 0 ? '+' : ''}{crop.priceChangePercent}%
                      </span>
                      <span className="text-gray-400 text-sm">{t('market.vsLastMonth')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getDemandBadge(crop.demand)}>
                        {crop.demand} {t('market.demand')}
                      </Badge>
                      <Badge variant="outline">{crop.supply} {t('market.supply')}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Selected Crop Detail Chart */}
            {selectedCropData && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{selectedCropData.cropName} {t('market.priceHistory')}</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={chartType === 'line' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setChartType('line')}
                    >
                      <LineChartIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={chartType === 'bar' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setChartType('bar')}
                    >
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'line' ? (
                        <AreaChart data={selectedCropData.history}>
                          <defs>
                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Area
                            type="monotone"
                            dataKey="price"
                            stroke="#10b981"
                            fillOpacity={1}
                            fill="url(#colorPrice)"
                          />
                        </AreaChart>
                      ) : (
                        <BarChart data={selectedCropData.history}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="price" fill="#10b981" />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('market.priceComparison')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cropPrices}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="cropName" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="currentPrice" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('market.marketDistribution')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AI Predictions Tab */}
          <TabsContent value="predictions" className="space-y-6">
            <Alert className="bg-purple-50 dark:bg-purple-900/20 border-purple-200">
              <Brain className="w-5 h-5 text-purple-600" />
              <AlertDescription>
                {t('market.aiAnalysisDesc')}
              </AlertDescription>
            </Alert>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cropPrices.map((crop) => {
                const prediction = crop.prediction?.[0];
                return (
                  <Card key={crop.id}>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{crop.cropName}</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">{t('market.current')}</span>
                          <span className="font-medium">₹{crop.currentPrice.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">{t('market.predicted')} ({prediction?.date})</span>
                          <span className={`font-medium ${(prediction?.price || 0) > crop.currentPrice ? 'text-green-600' : 'text-red-600'
                            }`}>
                            ₹{prediction?.price.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">{t('market.confidence')}</span>
                          <Badge variant="outline">{prediction?.confidence}%</Badge>
                        </div>
                        <div className="pt-2 border-t">
                          <p className="text-sm text-gray-600">
                            {((prediction?.price || 0) > crop.currentPrice) ? (
                              <span className="text-green-600 flex items-center gap-1">
                                <TrendingUp className="w-4 h-4" />
                                {t('market.expectedToRise')} {(((prediction?.price || 0) - crop.currentPrice) / crop.currentPrice * 100).toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-red-600 flex items-center gap-1">
                                <TrendingDown className="w-4 h-4" />
                                {t('market.expectedToFall')} {(((crop.currentPrice - (prediction?.price || 0)) / crop.currentPrice) * 100).toFixed(1)}%
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* AI Recommendation */}
            <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Brain className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{t('market.aiRecommendation')}</h3>
                    <p className="text-purple-100">
                      {t('market.aiRecommendationDesc')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <div className="grid gap-4">
              {insights.map((insight) => (
                <Card key={insight.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${insight.impact === 'high' ? 'bg-red-100' :
                        insight.impact === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                        }`}>
                        <AlertCircle className={`w-5 h-5 ${insight.impact === 'high' ? 'text-red-600' :
                          insight.impact === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                          }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{insight.title}</h3>
                          <Badge variant={
                            insight.impact === 'high' ? 'destructive' :
                              insight.impact === 'medium' ? 'default' : 'secondary'
                          }>
                            {insight.impact} {t('market.impact')}
                          </Badge>
                          <Badge variant="outline">{insight.category} {t('market.categoryLabel')}</Badge>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">{insight.description}</p>
                        <p className="text-sm text-gray-400 mt-2 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(insight.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
