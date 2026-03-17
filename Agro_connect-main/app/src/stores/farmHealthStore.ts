import { create } from './zustand-mock';
import * as tf from '@tensorflow/tfjs';
import labelsData from './labels.json';
import { toast } from 'sonner';

export interface CropHealth {
  id: string;
  cropName: string;
  healthScore: number;
  status: 'healthy' | 'at-risk' | 'diseased' | 'unknown';
  lastChecked: string;
  issues: string[];
  recommendations: string[];
  imageUrl?: string;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  forecast: Array<{
    date: string;
    temp: number;
    condition: string;
    icon: string;
  }>;
}

export interface SoilData {
  ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  moisture: number;
  texture: string;
}

export interface Alert {
  id: string;
  type: 'fire' | 'theft' | 'disease' | 'weather' | 'pest';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  location: string;
  timestamp: string;
  isActive: boolean;
}

interface FarmHealthState {
  crops: CropHealth[];
  weather: WeatherData | null;
  soil: SoilData | null;
  alerts: Alert[];
  isAnalyzing: boolean;
  analysisResult: any | null;
  model: tf.LayersModel | null;
  labels: string[];
  fetchCrops: () => void;
  fetchWeather: (lat: number, lon: number) => void;
  fetchSoilData: () => void;
  loadModel: () => Promise<void>;
  analyzeImage: (imageFile: File, plantName?: string) => Promise<any>;
  resetAnalysis: () => void;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp'>) => void;
  resolveAlert: (id: string) => void;
}

const mockCrops: CropHealth[] = [
  {
    id: '1',
    cropName: 'Wheat',
    healthScore: 85,
    status: 'healthy',
    lastChecked: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    issues: [],
    recommendations: ['Continue regular irrigation', 'Monitor for rust disease'],
    imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400'
  },
  {
    id: '2',
    cropName: 'Rice',
    healthScore: 62,
    status: 'at-risk',
    lastChecked: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    issues: ['Early signs of blast disease', 'Nitrogen deficiency'],
    recommendations: ['Apply fungicide immediately', 'Add nitrogen-rich fertilizer'],
    imageUrl: 'https://images.unsplash.com/photo-1536617621572-1d5f1e6269a0?w=400'
  },
  {
    id: '3',
    cropName: 'Sugarcane',
    healthScore: 78,
    status: 'healthy',
    lastChecked: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    issues: [],
    recommendations: ['Check for borer infestation', 'Maintain water levels'],
    imageUrl: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400'
  }
];

const mockWeather: WeatherData = {
  temperature: 32,
  humidity: 65,
  rainfall: 2.5,
  windSpeed: 12,
  forecast: [
    { date: 'Today', temp: 32, condition: 'Sunny', icon: 'sun' },
    { date: 'Tomorrow', temp: 30, condition: 'Partly Cloudy', icon: 'cloud-sun' },
    { date: 'Wed', temp: 28, condition: 'Rainy', icon: 'cloud-rain' },
    { date: 'Thu', temp: 29, condition: 'Cloudy', icon: 'cloud' },
    { date: 'Fri', temp: 31, condition: 'Sunny', icon: 'sun' }
  ]
};

const mockSoil: SoilData = {
  ph: 6.8,
  nitrogen: 45,
  phosphorus: 32,
  potassium: 180,
  moisture: 42,
  texture: 'Loamy'
};

const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'fire',
    severity: 'critical',
    message: 'High temperature anomaly detected in wheat field',
    location: 'Sector B, Plot 3',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    isActive: true
  },
  {
    id: '2',
    type: 'disease',
    severity: 'high',
    message: 'Rice blast disease detected',
    location: 'Sector A, Plot 1',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    isActive: true
  }
];

export const useFarmHealthStore = create<FarmHealthState>((set, get) => ({
  crops: mockCrops,
  weather: mockWeather,
  soil: mockSoil,
  alerts: mockAlerts,
  isAnalyzing: false,
  analysisResult: null,
  model: null,
  labels: labelsData,

  fetchCrops: () => {
    set({ crops: mockCrops });
  },

  fetchWeather: async (lat: number, lon: number) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    set({ weather: mockWeather });
  },

  fetchSoilData: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    set({ soil: mockSoil });
  },

  loadModel: async () => {
    try {
      if (get().model) return;

      console.log('[FarmHealthStore] Waiting for TFJS to be ready...');
      await tf.ready();

      console.log('[FarmHealthStore] Loading model from /tfjs_model/model.json...');
      const model = await tf.loadLayersModel('/tfjs_model/model.json');
      set({ model });
      console.log('[FarmHealthStore] Model loaded successfully');
    } catch (error) {
      console.error('[FarmHealthStore] Failed to load TFJS model:', error);
      toast.error('Failed to load AI model. Please check your connection.');
    }
  },

  analyzeImage: async (imageFile: File, plantName?: string) => {
    console.log('[FarmHealthStore] Starting analysis for:', imageFile.name, 'Plant:', plantName);
    set({ isAnalyzing: true, analysisResult: null });

    try {
      let { model, labels, loadModel } = get();

      if (!model) {
        console.log('[FarmHealthStore] Model not loaded, triggered loadModel...');
        await loadModel();
        ({ model, labels } = get());
      }

      if (!model) {
        console.error('[FarmHealthStore] Model loading failed.');
        throw new Error('Model could not be loaded');
      }

      // 1. Convert file to image element
      const imageUrl = URL.createObjectURL(imageFile);
      const img = new Image();

      console.log('[FarmHealthStore] Waiting for image to load...');
      await new Promise((resolve, reject) => {
        img.onload = () => {
          console.log('[FarmHealthStore] Image loaded successfully');
          resolve(null);
        };
        img.onerror = (e) => {
          console.error('[FarmHealthStore] Image load failed:', e);
          reject(new Error('Failed to load image for analysis'));
        };
        img.src = imageUrl;
      });

      // 2. Preprocess image
      console.log('[FarmHealthStore] Preprocessing image to tensor...');
      const tensor = tf.tidy(() => {
        // NOTE: We don't div(255.0) here because the model has a built-in rescaling layer 
        // that handles the conversion to [-1, 1] from [0, 255]
        return tf.browser.fromPixels(img)
          .resizeBilinear([224, 224])
          .toFloat()
          .expandDims(0);
      });
      console.log('[FarmHealthStore] Tensor created:', tensor.shape);

      // 3. Inference
      console.log('[FarmHealthStore] Running inference...');
      const prediction = model.predict(tensor) as tf.Tensor;
      const data = await prediction.data();
      console.log('[FarmHealthStore] Inference complete. Output size:', data.length);

      const maxIndex = data.indexOf(Math.max(...Array.from(data)));
      const confidence = Math.round(data[maxIndex] * 100);
      const diseaseLabel = labels[maxIndex] || `Unknown Issue (Class ${maxIndex})`;
      console.log('[FarmHealthStore] Match found:', diseaseLabel, 'at index', maxIndex, 'with', confidence, '% confidence');

      // 4. Map result
      const isGoodHealth = diseaseLabel.toLowerCase().includes('healthy') || diseaseLabel.toLowerCase() === 'background';

      const result = {
        disease: diseaseLabel.replace(/___/g, ' ').replace(/_/g, ' '),
        confidence: confidence,
        severity: confidence > 80 ? (isGoodHealth ? 'low' : 'high') : (confidence > 50 ? 'medium' : 'low'),
        imageUrl: imageUrl, // Keep imageUrl from original
        recommendations: isGoodHealth ? [
          'Continue regular monitoring',
          'Maintain current irrigation schedule',
          'Ensure optimal nutrient balance'
        ] : [
          'Isolate affected plants if possible',
          'Apply appropriate organic fungicides',
          'Check soil moisture and pH levels'
        ],
        preventiveMeasures: [
          'Use certified disease-free seeds',
          'Improve air circulation between plants',
          'Avoid overhead watering'
        ]
      };

      // Cleanup tensor
      tf.dispose([tensor, prediction]);

      console.log('[FarmHealthStore] Analysis success, updating state.');
      // Small delay to ensure isAnalyzing UI state is visible if transition is too fast
      await new Promise(r => setTimeout(r, 800));

      set({ isAnalyzing: false, analysisResult: result });
      return result;

    } catch (error: any) {
      console.error('[FarmHealthStore] Error during image analysis:', error);
      set({ isAnalyzing: false });
      toast.error(error.message || 'Error occurred during AI analysis');
      return null;
    }
  },

  resetAnalysis: () => {
    const { analysisResult } = get();
    if (analysisResult?.imageUrl) {
      URL.revokeObjectURL(analysisResult.imageUrl);
    }
    set({ analysisResult: null });
  },

  addAlert: (alert) => {
    const { alerts } = get();
    const newAlert: Alert = {
      ...alert,
      id: `${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    set({ alerts: [newAlert, ...alerts] });
  },

  resolveAlert: (id: string) => {
    const { alerts } = get();
    set({
      alerts: alerts.map(a =>
        a.id === id ? { ...a, isActive: false } : a
      )
    });
  }
}));
