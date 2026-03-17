export interface CropRecommendationInput {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  temperature: number;
  humidity: number;
  ph: number;
  rainfall: number;
}

export interface CropPrediction {
  crop: string;
  confidence: number;
}

export interface CropRecommendationResult {
  recommended_crop: string;
  confidence: number;
  top_predictions: CropPrediction[];
  explanation: string;
  alternatives: CropPrediction[];
}

export const REQUIRED_CROP_FIELDS: Array<keyof CropRecommendationInput> = [
  'nitrogen',
  'phosphorus',
  'potassium',
  'temperature',
  'humidity',
  'ph',
  'rainfall'
];
