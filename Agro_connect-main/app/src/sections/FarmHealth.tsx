import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Upload,
  Camera,
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  CloudSun,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Sprout,
  Brain,
  Loader2,
  MapPin,
  Clock,
  Leaf,
  FlaskConical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFarmHealthStore } from '../stores/farmHealthStore';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { useLanguageStore } from '../stores/languageStore';

export function FarmHealth() {
  const { t } = useLanguageStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    crops,
    weather,
    soil,
    alerts,
    isAnalyzing,
    analysisResult,
    fetchCrops,
    fetchWeather,
    fetchSoilData,
    analyzeImage,
    resetAnalysis,
    resolveAlert
  } = useFarmHealthStore();

  useEffect(() => {
    fetchCrops();
    fetchWeather(20.5937, 78.9629);
    fetchSoilData();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAnalyze = async () => {
    if (selectedFile) {
      try {
        const result = await analyzeImage(selectedFile, selectedPlant);
        if (result) {
          toast.success(t('farm.analysisComplete') || 'Analysis complete!');
          setIsUploadDialogOpen(false);
          setActiveTab('ai-analysis');
        } else {
          toast.error('Analysis failed. Please try again.');
        }
      } catch (error) {
        toast.error('An error occurred during analysis.');
        console.error(error);
      }
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      healthy: 'bg-green-100 text-green-700',
      'at-risk': 'bg-yellow-100 text-yellow-700',
      diseased: 'bg-red-100 text-red-700',
      unknown: 'bg-gray-100 text-gray-700'
    };
    return variants[status] || variants.unknown;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Sprout className="w-8 h-8 text-green-600" />
            {t('farm.healthMonitoring')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('farm.subtitle')}
          </p>
        </div>

        {/* Alerts Banner */}
        {alerts.filter(a => a.isActive).length > 0 && (
          <div className="mb-6 space-y-3">
            {alerts.filter(a => a.isActive).map((alert) => (
              <Alert
                key={alert.id}
                variant={alert.severity === 'critical' ? 'destructive' : 'default'}
                className="border-l-4"
              >
                <AlertTriangle className="w-5 h-5" />
                <AlertTitle className="flex items-center gap-2">
                  {alert.type === 'fire' && t('farm.fireAlert')}
                  {alert.type === 'theft' && t('farm.theftAlert')}
                  {alert.type === 'disease' && t('farm.diseaseAlert')}
                  {alert.type === 'weather' && t('farm.weatherAlert')}
                  {alert.type === 'pest' && t('farm.pestAlert')}
                  <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                    {alert.severity.toUpperCase()}
                  </Badge>
                </AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <div>
                    <p>{alert.message}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {alert.location} • {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolveAlert(alert.id)}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    {t('farm.resolve')}
                  </Button>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 lg:w-fit">
            <TabsTrigger value="overview">{t('farm.overview')}</TabsTrigger>
            <TabsTrigger value="ai-analysis">{t('farm.aiAnalysis')}</TabsTrigger>
            <TabsTrigger value="weather">{t('farm.weather')}</TabsTrigger>
            <TabsTrigger value="soil">{t('farm.soilData')}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Crop Health Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {crops.map((crop) => (
                <Card key={crop.id} className="overflow-hidden">
                  <div className="relative h-40">
                    <img
                      src={crop.imageUrl}
                      alt={crop.cropName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3">
                      <Badge className={getStatusBadge(crop.status)}>
                        {crop.status}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">{crop.cropName}</h3>
                      <span className={`text-2xl font-bold ${getHealthColor(crop.healthScore)}`}>
                        {crop.healthScore}%
                      </span>
                    </div>
                    <Progress value={crop.healthScore} className="mb-3" />
                    <div className="flex items-center text-sm text-gray-500 mb-3">
                      <Clock className="w-4 h-4 mr-1" />
                      {t('farm.lastChecked')}: {new Date(crop.lastChecked).toLocaleDateString()}
                    </div>
                    {crop.issues.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-red-600">{t('farm.issues')}:</p>
                        {crop.issues.map((issue, idx) => (
                          <p key={idx} className="text-sm text-gray-600 flex items-center">
                            <XCircle className="w-3 h-3 mr-1 text-red-500" />
                            {issue}
                          </p>
                        ))}
                      </div>
                    )}
                    {crop.recommendations.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-sm font-medium text-green-600">{t('farm.recommendations')}:</p>
                        {crop.recommendations.map((rec, idx) => (
                          <p key={idx} className="text-sm text-gray-600 flex items-center">
                            <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                            {rec}
                          </p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  {t('farm.aiActions')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={() => setIsUploadDialogOpen(true)}
                  >
                    <Camera className="w-8 h-8 text-blue-500" />
                    <span>{t('farm.analyzeCrop')}</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={() => setActiveTab('weather')}
                  >
                    <CloudSun className="w-8 h-8 text-yellow-500" />
                    <span>{t('farm.checkWeather')}</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={() => setActiveTab('soil')}
                  >
                    <FlaskConical className="w-8 h-8 text-green-500" />
                    <span>{t('farm.soilAnalysis')}</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2"
                  >
                    <Leaf className="w-8 h-8 text-emerald-500" />
                    <span>{t('farm.fertilizerGuide')}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Analysis Tab */}
          <TabsContent value="ai-analysis" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  {t('farm.plantDoctor') || 'Plant Doctor'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!analysisResult ? (
                  <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                    <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
                      <Camera className="w-10 h-10 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{t('farm.uploadCrop')}</h3>
                    <p className="text-gray-500 text-center max-w-md mb-4">
                      {t('farm.uploadInstruction') || 'Take a clear photo and our AI will detect diseases.'}
                    </p>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => setIsUploadDialogOpen(true)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {t('farm.uploadBtn') || 'Upload Image'}
                      </Button>
                      <Button variant="outline">
                        <Camera className="w-4 h-4 mr-2" />
                        {t('farm.cameraBtn') || 'Take Photo'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center py-4">
                    <Card className="max-w-md w-full overflow-hidden border-2 border-purple-100 dark:border-purple-900/30 shadow-xl">
                      <div className="relative h-56">
                        <img
                          src={analysisResult.imageUrl}
                          alt="Analyzed crop"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 right-3">
                          <Badge variant={analysisResult.healthStatus === 'Good' ? 'default' : 'destructive'} className="shadow-lg">
                            {analysisResult.healthStatus === 'Good' ? t('farm.goodHealth') : t('farm.badHealth')}
                          </Badge>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                          <h4 className="text-white font-bold text-xl drop-shadow-md">
                            {analysisResult.disease.replace(/___/g, ' - ').replace(/_/g, ' ')}
                          </h4>
                        </div>
                      </div>
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{t('farm.confidence')}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{analysisResult.confidence}%</span>
                              <Progress value={analysisResult.confidence} className="w-24 h-2" />
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{t('farm.severity')}</p>
                            <Badge variant="outline" className="mt-1 capitalize text-sm px-3">
                              {analysisResult.severity}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2">
                          <p className="text-sm font-bold flex items-center gap-2 text-green-700 dark:text-green-400">
                            <CheckCircle className="w-4 h-4" />
                            {t('farm.recommendations')}
                          </p>
                          <ul className="space-y-2">
                            {analysisResult.recommendations.map((rec: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 leading-tight">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {analysisResult.preventiveMeasures && (
                          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                            <p className="text-sm font-bold flex items-center gap-2 text-purple-700 dark:text-purple-400">
                              <Clock className="w-4 h-4" />
                              {t('farm.preventiveMeasures')}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {analysisResult.preventiveMeasures.map((measure: string, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-[10px] bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-normal">
                                  {measure}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <Button
                          onClick={resetAnalysis}
                          variant="ghost"
                          className="w-full mt-4 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-semibold"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          {t('farm.analyseAnother') || 'Analyze Another'}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Weather Tab */}
          <TabsContent value="weather" className="space-y-6">
            {weather && (
              <>
                {/* Current Weather */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                        <Thermometer className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{t('dashboard.temp')}</p>
                        <p className="text-2xl font-bold">{weather.temperature}°C</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Droplets className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{t('dashboard.humidity')}</p>
                        <p className="text-2xl font-bold">{weather.humidity}%</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <Wind className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{t('dashboard.wind')}</p>
                        <p className="text-2xl font-bold">{weather.windSpeed} km/h</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center">
                        <CloudRain className="w-6 h-6 text-cyan-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{t('dashboard.rainfall')}</p>
                        <p className="text-2xl font-bold">{weather.rainfall} mm</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Forecast */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('farm.forecast') || '5-Day Forecast'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-5 gap-4">
                      {weather.forecast.map((day, idx) => (
                        <div key={idx} className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="font-medium">{day.date}</p>
                          <div className="my-3">
                            {day.icon === 'sun' && <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mx-auto"><Thermometer className="w-5 h-5 text-yellow-600" /></div>}
                            {day.icon === 'cloud' && <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto"><CloudRain className="w-5 h-5 text-gray-600" /></div>}
                            {day.icon === 'cloud-sun' && <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto"><CloudSun className="w-5 h-5 text-blue-600" /></div>}
                            {day.icon === 'cloud-rain' && <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center mx-auto"><CloudRain className="w-5 h-5 text-cyan-600" /></div>}
                          </div>
                          <p className="text-lg font-bold">{day.temp}°C</p>
                          <p className="text-sm text-gray-500">{day.condition}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Soil Data Tab */}
          <TabsContent value="soil" className="space-y-6">
            {soil && (
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FlaskConical className="w-5 h-5 text-green-600" />
                      {t('farm.soilComposition')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">{t('farm.phLevel')}</span>
                          <span className="text-sm text-gray-500">{soil.ph}</span>
                        </div>
                        <Progress value={(soil.ph / 14) * 100} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">{t('farm.nitrogen')}</span>
                          <span className="text-sm text-gray-500">{soil.nitrogen} kg/ha</span>
                        </div>
                        <Progress value={(soil.nitrogen / 100) * 100} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">{t('farm.phosphorus')}</span>
                          <span className="text-sm text-gray-500">{soil.phosphorus} kg/ha</span>
                        </div>
                        <Progress value={(soil.phosphorus / 50) * 100} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">{t('farm.potassium')}</span>
                          <span className="text-sm text-gray-500">{soil.potassium} kg/ha</span>
                        </div>
                        <Progress value={(soil.potassium / 300) * 100} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">{t('farm.moisture')}</span>
                          <span className="text-sm text-gray-500">{soil.moisture}%</span>
                        </div>
                        <Progress value={soil.moisture} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('farm.soilRecommendations')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Alert>
                        <Leaf className="w-4 h-4" />
                        <AlertTitle>Optimal pH Level</AlertTitle>
                        <AlertDescription>
                          Your soil pH of {soil.ph} is ideal for most crops. Maintain current practices.
                        </AlertDescription>
                      </Alert>
                      <Alert>
                        <Sprout className="w-4 h-4" />
                        <AlertTitle>Nitrogen Boost Needed</AlertTitle>
                        <AlertDescription>
                          Consider adding nitrogen-rich fertilizers for better crop growth.
                        </AlertDescription>
                      </Alert>
                      <Alert>
                        <Droplets className="w-4 h-4" />
                        <AlertTitle>Moisture Management</AlertTitle>
                        <AlertDescription>
                          Current moisture level is good. Monitor during dry spells.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Upload Dialog */}
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('farm.analyzeCrop')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      {t('farm.clickUpload') || 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {t('farm.uploadLimit') || 'Supports JPG, PNG up to 10MB'}
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('farm.selectPlant') || 'Select Plant Type'}
                </label>
                <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('farm.choosePlant') || "Choose a plant..."} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tomato">Tomato</SelectItem>
                    <SelectItem value="potato">Potato</SelectItem>
                    <SelectItem value="apple">Apple</SelectItem>
                    <SelectItem value="grapes">Grapes</SelectItem>
                    <SelectItem value="mango">Mango</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                onClick={handleAnalyze}
                disabled={!selectedFile || !selectedPlant || isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('farm.analyzing') || 'Analyzing...'}
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    {t('farm.analyse') || 'Analyse'}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
