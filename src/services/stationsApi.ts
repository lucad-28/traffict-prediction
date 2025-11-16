// services/stationsApi.ts
import { TrafficStation } from '@/data/stations';

export interface StationsResponse {
  total: number;
  stations: TrafficStation[];
}

export class StationsApiService {
  private baseUrl = 'https://traffict-predict-api-452792205673.southamerica-west1.run.app';
  //private baseUrl = 'http://localhost:8000';

  async getAllStations(): Promise<StationsResponse> {
    const response = await fetch(`${this.baseUrl}/stations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch stations: ${response.statusText}`);
    }

    return response.json();
  }

  async getStationById(stationId: number): Promise<TrafficStation> {
    const response = await fetch(`${this.baseUrl}/stations/${stationId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Station ${stationId} not found`);
    }

    return response.json();
  }

  async checkApiHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
}