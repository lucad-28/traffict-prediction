export interface RouteInfo {
  route_id: number;
  route_name: string;
  stations: number[];
  num_stations: number;
  total_time_minutes: number;
  total_distance_km: number;
  avg_spi: number;
  min_spi: number;
  congested_segments: number;
  total_segments: number;
  congestion_percentage: number;
  status: "excellent" | "good" | "moderate" | "congested";
}

export interface RouteRequest {
  origin_station: number;
  destination_station: number;
  current_predictions: Record<number, number>;
  num_routes?: number;
}

export interface RouteResponse {
  origin: {
    station_id: number;
    current_spi: number;
  };
  destination: {
    station_id: number;
    current_spi: number;
  };
  routes: RouteInfo[];
  recommendation: string;
  graph_stats?: {
    nodes: number;
    edges: number;
  };
}
