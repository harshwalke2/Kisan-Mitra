export interface CropRecommendationPayload {
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

export interface CropRecommendationResponse {
  recommended_crop: string;
  confidence: number;
  top_predictions: CropPrediction[];
  explanation: string;
  alternatives: CropPrediction[];
}

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export async function requestCropRecommendation(
  payload: CropRecommendationPayload
): Promise<CropRecommendationResponse> {
  console.log('[crop-service] sending request', {
    url: `${API_BASE_URL}/api/crop-recommend`,
    payload,
  });

  const response = await fetch(`${API_BASE_URL}/api/crop-recommend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const errorMessage = errorBody?.message || 'Failed to fetch crop recommendation';
    console.error('[crop-service] request failed', {
      status: response.status,
      errorBody,
    });
    throw new Error(errorMessage);
  }

  const data = (await response.json()) as CropRecommendationResponse;
  console.log('[crop-service] prediction received', data);
  return data;
}
