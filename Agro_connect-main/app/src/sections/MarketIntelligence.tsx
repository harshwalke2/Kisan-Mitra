import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  Filter,
  LineChart as LineChartIcon,
  MapPin,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchLiveMarketInsights } from '../services/socialFeatureService';

type Impact = 'high' | 'medium' | 'low';

type MarketInsight = {
  id: string;
  title: string;
  description: string;
  category: string;
  impact: Impact;
  createdAt: string;
};

type MarketObservation = {
  state: string;
  city: string;
  market: string;
  commodity: string;
  location: string;
  modalPrice: number;
  arrivalDate: string;
};

type MarketStatistics = {
  totalRecords: number;
  totalStates: number;
  totalCities: number;
  totalMarkets: number;
  totalCommodities: number;
  stateOptions: string[];
  cityOptions: string[];
  lastUpdated: string | null;
};

type CommodityStat = {
  commodity: string;
  samples: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  latestPrice: number;
  previousPrice: number | null;
  trendPct: number;
  history: Array<{ date: string; price: number }>;
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#a855f7'];

const toDateLabel = (isoDate: string): string => {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }
  return parsed.toISOString().slice(0, 10);
};

const buildCommodityStats = (observations: MarketObservation[]): CommodityStat[] => {
  const grouped = new Map<string, MarketObservation[]>();

  observations.forEach((observation) => {
    const bucket = grouped.get(observation.commodity) || [];
    bucket.push(observation);
    grouped.set(observation.commodity, bucket);
  });

  const stats: CommodityStat[] = [];

  grouped.forEach((rows, commodity) => {
    const prices = rows.map((row) => row.modalPrice);
    const dateMap = new Map<string, { sum: number; count: number }>();

    rows.forEach((row) => {
      const dateKey = toDateLabel(row.arrivalDate);
      const current = dateMap.get(dateKey) || { sum: 0, count: 0 };
      current.sum += row.modalPrice;
      current.count += 1;
      dateMap.set(dateKey, current);
    });

    const history = [...dateMap.entries()]
      .map(([date, value]) => ({ date, price: value.sum / value.count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const latestPrice = history.length > 0 ? history[history.length - 1].price : 0;
    const previousPrice = history.length > 1 ? history[history.length - 2].price : null;
    const trendPct = previousPrice && previousPrice > 0
      ? ((latestPrice - previousPrice) / previousPrice) * 100
      : 0;

    stats.push({
      commodity,
      samples: rows.length,
      avgPrice: prices.reduce((sum, price) => sum + price, 0) / Math.max(prices.length, 1),
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      latestPrice,
      previousPrice,
      trendPct,
      history,
    });
  });

  return stats.sort((a, b) => b.samples - a.samples);
};

export function MarketIntelligence() {
  const [activeTab, setActiveTab] = useState('prices');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedCommodity, setSelectedCommodity] = useState<string>('');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  const [insights, setInsights] = useState<MarketInsight[]>([]);
  const [observations, setObservations] = useState<MarketObservation[]>([]);
  const [statistics, setStatistics] = useState<MarketStatistics>({
    totalRecords: 0,
    totalStates: 0,
    totalCities: 0,
    totalMarkets: 0,
    totalCommodities: 0,
    stateOptions: [],
    cityOptions: [],
    lastUpdated: null,
  });
  const [source, setSource] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      setStatus('loading');
      setErrorMessage('');

      try {
        const response = await fetchLiveMarketInsights({
          state: selectedState === 'all' ? undefined : selectedState,
          city: selectedCity === 'all' ? undefined : selectedCity,
          limit: 1000,
        });

        setInsights(response.insights || []);
        setObservations(response.observations || []);
        setStatistics(response.statistics || {
          totalRecords: 0,
          totalStates: 0,
          totalCities: 0,
          totalMarkets: 0,
          totalCommodities: 0,
          stateOptions: [],
          cityOptions: [],
          lastUpdated: null,
        });
        setSource(response.source || 'Government market data');
        setStatus('ready');
      } catch (_error) {
        setInsights([]);
        setObservations([]);
        setStatus('error');
        setErrorMessage('Unable to load market intelligence right now. Please try again.');
      }
    };

    void load();
  }, [selectedState, selectedCity]);

  const commodityStats = useMemo(() => {
    const base = buildCommodityStats(observations);
    if (!searchQuery.trim()) {
      return base;
    }

    const normalized = searchQuery.trim().toLowerCase();
    return base.filter((item) => item.commodity.toLowerCase().includes(normalized));
  }, [observations, searchQuery]);

  useEffect(() => {
    if (!selectedCommodity && commodityStats.length > 0) {
      setSelectedCommodity(commodityStats[0].commodity);
      return;
    }

    if (selectedCommodity && !commodityStats.some((item) => item.commodity === selectedCommodity)) {
      setSelectedCommodity(commodityStats.length > 0 ? commodityStats[0].commodity : '');
    }
  }, [commodityStats, selectedCommodity]);

  const selectedCommodityData = useMemo(
    () => commodityStats.find((item) => item.commodity === selectedCommodity) || null,
    [commodityStats, selectedCommodity]
  );

  const stateDistribution = useMemo(() => {
    const grouped = new Map<string, number>();
    observations.forEach((observation) => {
      grouped.set(observation.state, (grouped.get(observation.state) || 0) + 1);
    });

    return [...grouped.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [observations]);

  const cityDistribution = useMemo(() => {
    const grouped = new Map<string, number>();
    observations.forEach((observation) => {
      grouped.set(observation.city, (grouped.get(observation.city) || 0) + 1);
    });

    return [...grouped.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [observations]);

  const momentumLeaders = useMemo(
    () => [...commodityStats].sort((a, b) => b.trendPct - a.trendPct).slice(0, 6),
    [commodityStats]
  );

  const getImpactBadge = (impact: Impact) => {
    if (impact === 'high') {
      return 'destructive';
    }
    if (impact === 'medium') {
      return 'default';
    }
    return 'secondary';
  };

  const getTrendTone = (value: number): 'text-green-600' | 'text-red-600' | 'text-gray-600' => {
    if (value > 0) {
      return 'text-green-600';
    }
    if (value < 0) {
      return 'text-red-600';
    }
    return 'text-gray-600';
  };

  const onStateChange = (value: string) => {
    setSelectedState(value);
    setSelectedCity('all');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-600" />
            Crop Market Intelligence
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            State-wise and city-wise analytics from government mandi records.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Records</p><p className="text-xl font-semibold">{statistics.totalRecords}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-gray-500">States</p><p className="text-xl font-semibold">{statistics.totalStates}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Cities</p><p className="text-xl font-semibold">{statistics.totalCities}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Markets</p><p className="text-xl font-semibold">{statistics.totalMarkets}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Commodities</p><p className="text-xl font-semibold">{statistics.totalCommodities}</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Source</p>
              <p className="text-sm font-medium">{source || 'Government market data'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">State</p>
              <Select value={selectedState} onValueChange={onStateChange}>
                <SelectTrigger><SelectValue placeholder="All states" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All states</SelectItem>
                  {statistics.stateOptions.map((state) => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">City / District</p>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger disabled={status === 'loading' || statistics.cityOptions.length === 0}>
                  <SelectValue placeholder="All cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cities</SelectItem>
                  {statistics.cityOptions.map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Commodity search</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Filter commodity"
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {statistics.lastUpdated && (
          <Alert className="bg-blue-50 border-blue-200">
            <Calendar className="w-4 h-4" />
            <AlertDescription>
              Latest data point: {new Date(statistics.lastUpdated).toLocaleString()}
            </AlertDescription>
          </Alert>
        )}

        {status === 'loading' && (
          <Alert>
            <AlertDescription>Loading market intelligence...</AlertDescription>
          </Alert>
        )}

        {status === 'error' && (
          <Alert className="bg-red-50 border-red-200">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 lg:w-fit">
            <TabsTrigger value="prices">Live Prices</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="predictions">Momentum</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="prices" className="space-y-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {commodityStats.slice(0, 12).map((item) => (
                <Card
                  key={item.commodity}
                  className={`cursor-pointer transition-all hover:shadow-lg ${selectedCommodity === item.commodity ? 'ring-2 ring-green-500' : ''}`}
                  onClick={() => setSelectedCommodity(item.commodity)}
                >
                  <CardContent className="p-4 space-y-2">
                    <p className="font-semibold truncate">{item.commodity}</p>
                    <p className="text-2xl font-bold">Rs {item.latestPrice.toFixed(0)}</p>
                    <p className="text-xs text-gray-500">Avg Rs {item.avgPrice.toFixed(0)} | Samples {item.samples}</p>
                    <p className={`text-sm flex items-center gap-1 ${getTrendTone(item.trendPct)}`}>
                      {item.trendPct >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {item.trendPct >= 0 ? '+' : ''}{item.trendPct.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedCommodityData && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{selectedCommodityData.commodity} history</CardTitle>
                  <div className="flex gap-2">
                    <Button variant={chartType === 'line' ? 'default' : 'outline'} size="sm" onClick={() => setChartType('line')}>
                      <LineChartIcon className="w-4 h-4" />
                    </Button>
                    <Button variant={chartType === 'bar' ? 'default' : 'outline'} size="sm" onClick={() => setChartType('bar')}>
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'line' ? (
                        <AreaChart data={selectedCommodityData.history}>
                          <defs>
                            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Area type="monotone" dataKey="price" stroke="#10b981" fill="url(#priceGradient)" />
                        </AreaChart>
                      ) : (
                        <BarChart data={selectedCommodityData.history}>
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

          <TabsContent value="trends" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Top commodities by average price</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={commodityStats.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="commodity" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="avgPrice" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>State-wise record distribution</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stateDistribution} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name" label>
                          {stateDistribution.map((entry, index) => (
                            <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>City-wise coverage</CardTitle></CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {cityDistribution.map((city) => (
                  <div key={city.name} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <span className="flex items-center gap-2 truncate"><MapPin className="w-4 h-4 text-gray-500" />{city.name}</span>
                    <Badge variant="outline">{city.value}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-6">
            <Alert className="bg-purple-50 border-purple-200">
              <AlertDescription>
                Momentum is computed from the two latest observation windows per commodity in the selected state/city.
              </AlertDescription>
            </Alert>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {momentumLeaders.map((item) => (
                <Card key={`${item.commodity}-momentum`}>
                  <CardContent className="p-4 space-y-2">
                    <p className="font-semibold truncate">{item.commodity}</p>
                    <p className="text-sm text-gray-500">Latest Rs {item.latestPrice.toFixed(0)} | Avg Rs {item.avgPrice.toFixed(0)}</p>
                    <p className={`text-sm flex items-center gap-1 ${getTrendTone(item.trendPct)}`}>
                      {item.trendPct >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {item.trendPct >= 0 ? '+' : ''}{item.trendPct.toFixed(1)}%
                    </p>
                    <Badge variant="outline">Confidence {Math.min(95, Math.max(45, item.samples * 8))}%</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            {insights.map((insight) => (
              <Card key={insight.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold">{insight.title}</h3>
                        <Badge variant={getImpactBadge(insight.impact)}>{insight.impact} impact</Badge>
                        <Badge variant="outline">{insight.category}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{insight.description}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(insight.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
