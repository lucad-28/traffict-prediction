import { TrafficData } from '@/utils/trafficGenerator';

export interface PredictionRequest {
  sequence: number[][];
}

export interface FuzzyClassification {
  memberships: {
    heavy_congestion: number;
    mild_congestion: number;
    smooth: number;
    very_smooth: number;
  };
  dominant_category: string;
  dominant_label: string;
  confidence: number;
  is_transition_state: boolean;
  linguistic_description: string;
  ranked_categories: Array<{
    category: string;
    label: string;
    membership: number;
    color: string;
  }>;
}

export interface PredictionResponse {
  spi_predicted: number;
  congestion_level: number;
  congestion_label: string;
  fuzzy_classification: FuzzyClassification;
  traffic_state: string;
  confidence_level: 'high' | 'medium' | 'low';
  status: string;
}

export interface ApiError {
  error: string;
  message?: string;
}

export class PredictionApiService {
  private readonly apiUrl = 'https://traffict-predict-api-452792205673.southamerica-west1.run.app/predict';
  //private readonly apiUrl = 'http://localhost:8000/predict';

  async predict(trafficSequence: TrafficData[]): Promise<PredictionResponse> {
    // Mocked response for development/testing
    const formattedSequence = this.formatSequenceForApi(trafficSequence);
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sequence: formattedSequence
      }),
    });
    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`
      }));
      throw new Error(errorData.message || errorData.error || 'Prediction API request failed');
    }
    const result: PredictionResponse = await response.json();
    console.log("Prediction API response:", result);
    this.validatePredictionResponse(result);
    return result;

    // Return a mock response
    // return {
    //   spi_predicted: 0.85,
    //   congestion_level: 2,
    //   congestion_label: 'Heavy Traffic',
    //   status: 'success',
    // };
  }

  private formatSequenceForApi(trafficSequence: TrafficData[]): number[][] {
    return trafficSequence.map(data => [
      data.totalFlow,
      data.avgOccupancy,
      data.avgSpeed,
      data.hour,
      data.dayOfWeek,
      data.lanes,
      data.laneType
    ]);
  }

  private validatePredictionResponse(response: unknown): asserts response is PredictionResponse {
    if (typeof response !== 'object' || response === null) {
      throw new Error('Invalid response format: expected object');
    }

    const obj = response as Record<string, unknown>;

    if (typeof obj.spi_predicted !== 'number') {
      throw new Error('Invalid response: spi_predicted must be a number');
    }

    if (typeof obj.congestion_level !== 'number' ||
        obj.congestion_level < 0 ||
        obj.congestion_level > 3) {
      throw new Error('Invalid response: congestion_level must be a number between 0-3');
    }

    if (typeof obj.congestion_label !== 'string') {
      throw new Error('Invalid response: congestion_label must be a string');
    }

    if (typeof obj.status !== 'string') {
      throw new Error('Invalid response: status must be a string');
    }

    // Optional fuzzy classification validation - it's fine if not present for backward compatibility
    if (obj.fuzzy_classification) {
      const fuzzy = obj.fuzzy_classification as any;
      if (typeof fuzzy !== 'object' || fuzzy === null) {
        console.warn('fuzzy_classification is not an object, skipping validation');
      }
    }

    if (obj.traffic_state && typeof obj.traffic_state !== 'string') {
      console.warn('traffic_state is not a string');
    }

    if (obj.confidence_level && !['high', 'medium', 'low'].includes(obj.confidence_level as string)) {
      console.warn('confidence_level is not valid');
    }
  }

  getCongestionColor(level: number): string {
    switch (level) {
      case 0: return '#388E3C'; // Very smooth - Green
      case 1: return '#FBC02D'; // Smooth - Yellow
      case 2: return '#F57C00'; // Mild congestion - Orange
      case 3: return '#D32F2F'; // Heavy congestion - Red
      default: return '#6b7280'; // Gray for unknown
    }
  }

  getCongestionLabel(level: number): string {
    switch (level) {
      case 0: return 'Very Smooth';
      case 1: return 'Smooth';
      case 2: return 'Mild Congestion';
      case 3: return 'Heavy Congestion';
      default: return 'Unknown';
    }
  }

  getConfidenceColor(confidence: 'high' | 'medium' | 'low'): string {
    switch (confidence) {
      case 'high': return '#4CAF50'; // Green
      case 'medium': return '#FF9800'; // Orange
      case 'low': return '#F44336'; // Red
      default: return '#6b7280'; // Gray
    }
  }

  getConfidenceLabel(confidence: 'high' | 'medium' | 'low'): string {
    switch (confidence) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return 'Desconocida';
    }
  }

  async checkApiHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(this.apiUrl.replace('/predict', '/health'), {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
}