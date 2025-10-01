import { TrafficData } from '@/utils/trafficGenerator';

export interface PredictionRequest {
  sequence: number[][];
}

export interface PredictionResponse {
  spi_predicted: number;
  congestion_level: number;
  congestion_label: string;
  status: string;
}

export interface ApiError {
  error: string;
  message?: string;
}

export class PredictionApiService {
  private readonly apiUrl = 'https://traffict-predict-api-452792205673.southamerica-west1.run.app/predict';

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
  }

  getCongestionColor(level: number): string {
    switch (level) {
      case 0: return '#22c55e'; // Green
      case 1: return '#eab308'; // Yellow
      case 2: return '#f97316'; // Orange
      case 3: return '#ef4444'; // Red
      default: return '#6b7280'; // Gray for unknown
    }
  }

  getCongestionLabel(level: number): string {
    switch (level) {
      case 0: return 'Free Flow';
      case 1: return 'Light Traffic';
      case 2: return 'Heavy Traffic';
      case 3: return 'Congested';
      default: return 'Unknown';
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