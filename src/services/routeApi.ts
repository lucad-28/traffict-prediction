import { RouteRequest, RouteResponse } from '@/types/routes';

export class RouteApiService {
  private readonly apiUrl = 'https://traffict-predict-api-452792205673.southamerica-west1.run.app/routes/suggest';

  async suggestRoutes(request: RouteRequest): Promise<RouteResponse> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        detail: `HTTP ${response.status}: ${response.statusText}`
      }));
      throw new Error(errorData.detail || 'Failed to fetch routes');
    }

    return await response.json();
  }
}
