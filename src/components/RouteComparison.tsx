"use client";

import { useState } from 'react';
import { TrafficStation } from '@/data/stations';
import { RouteResponse, RouteInfo } from '@/types/routes';
import { RouteApiService } from '@/services/routeApi';
import { PredictionResponse } from '@/services/predictionApi';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import {
  MapPin,
  Navigation,
  Clock,
  Activity,
  AlertTriangle,
  Loader2,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

interface RouteComparisonProps {
  stations: TrafficStation[];
  predictions: Map<number, PredictionResponse>;
  onPredict: (station: TrafficStation) => Promise<void>;
  currentSequences: Map<number, { sequence: any[] }>;
  onRouteSelect?: (routeStations: number[]) => void;
}

const RouteComparison: React.FC<RouteComparisonProps> = ({
  stations,
  predictions,
  onPredict,
  currentSequences,
  onRouteSelect
}) => {
  const [originId, setOriginId] = useState<number | null>(null);
  const [destinationId, setDestinationId] = useState<number | null>(null);
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDestination, setSearchDestination] = useState('');

  const routeApi = new RouteApiService();

  // Filter stations based on search - limit to 50 results for performance
  const filteredOriginStations = stations
    .filter(s =>
      s.Name.toLowerCase().includes(searchOrigin.toLowerCase()) ||
      s.ID.toString().includes(searchOrigin) ||
      s.Fwy.toString().includes(searchOrigin)
    )
    .slice(0, 50);

  const filteredDestinationStations = stations
    .filter(s =>
      s.Name.toLowerCase().includes(searchDestination.toLowerCase()) ||
      s.ID.toString().includes(searchDestination) ||
      s.Fwy.toString().includes(searchDestination)
    )
    .slice(0, 50);

  const getSPIColor = (spi: number) => {
    if (spi >= 75) return 'bg-green-500';
    if (spi >= 50) return 'bg-blue-500';
    if (spi >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getSPITextColor = (spi: number) => {
    if (spi >= 75) return 'text-green-600';
    if (spi >= 50) return 'text-blue-600';
    if (spi >= 25) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSPILabel = (spi: number) => {
    if (spi >= 75) return 'Fluido';
    if (spi >= 50) return 'Moderado';
    if (spi >= 25) return 'Congestionado';
    return 'Muy Congestionado';
  };

  const getStatusColor = (status: RouteInfo['status']) => {
    const colors = {
      excellent: 'bg-green-100 text-green-800 border-green-300',
      good: 'bg-blue-100 text-blue-800 border-blue-300',
      moderate: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      congested: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status] || colors.moderate;
  };

  const handleSearchRoutes = async () => {
    if (!originId || !destinationId) return;

    setLoading(true);
    setError(null);

    try {
      const originStation = stations.find(s => s.ID === originId);
      const destStation = stations.find(s => s.ID === destinationId);

      if (!originStation || !destStation) {
        throw new Error('Estaciones no encontradas');
      }

      // Check if sequences are ready (12 data points generated)
      const originSequence = currentSequences.get(originId);
      const destSequence = currentSequences.get(destinationId);

      if (!originSequence || !destSequence) {
        throw new Error('⏳ Esperando datos de tráfico... Por favor espera unos segundos.');
      }

      if (originSequence.sequence.length < 12 || destSequence.sequence.length < 12) {
        throw new Error(`⏳ Generando datos históricos... (${Math.min(originSequence.sequence.length, destSequence.sequence.length)}/12 registros)`);
      }

      // Step 1: Identify relevant stations (same freeway/direction as origin or destination)
      const relevantStations = stations.filter(station => {
        // Include stations on the same freeway as origin or destination
        const sameFreewayAsOrigin = station.Fwy === originStation.Fwy && station.Dir === originStation.Dir;
        const sameFreewayAsDest = station.Fwy === destStation.Fwy && station.Dir === destStation.Dir;

        return sameFreewayAsOrigin || sameFreewayAsDest;
      });

      console.log(`🎯 Estaciones relevantes identificadas: ${relevantStations.length} de ${stations.length}`);

      // Step 2: Predict SPI for stations that don't have predictions yet and have current sequences
      // Use local Map to track new predictions
      const localPredictions = new Map<number, number>();

      // Add existing predictions
      predictions.forEach((pred, stationId) => {
        localPredictions.set(stationId, pred.spi_predicted);
      });

      const stationsToPredictPromises = relevantStations
        .filter(station => {
          const hasSequence = currentSequences.has(station.ID);
          const hasPrediction = localPredictions.has(station.ID);
          return hasSequence && !hasPrediction;
        });

      if (stationsToPredictPromises.length > 0) {
        console.log(`🔮 Prediciendo SPI para ${stationsToPredictPromises.length} estaciones...`);

        const predictionApi = new (await import('@/services/predictionApi')).PredictionApiService();

        // Predict sequentially in small batches to avoid overwhelming the API
        const batchSize = 10;
        for (let i = 0; i < stationsToPredictPromises.length; i += batchSize) {
          const batch = stationsToPredictPromises.slice(i, i + batchSize);

          // Predict in parallel within batch
          const batchPredictions = await Promise.all(
            batch.map(async (station) => {
              try {
                const sequence = currentSequences.get(station.ID);
                if (!sequence) return null;

                const prediction = await predictionApi.predict(sequence.sequence);
                return { stationId: station.ID, spi: prediction.spi_predicted };
              } catch (err) {
                console.warn(`Error prediciendo estación ${station.ID}:`, err);
                return null;
              }
            })
          );

          // Store predictions locally
          batchPredictions.forEach(result => {
            if (result) {
              localPredictions.set(result.stationId, result.spi);
            }
          });

          console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(stationsToPredictPromises.length / batchSize)} completado`);
        }

        console.log('✅ Todas las predicciones completadas');
      }

      // Step 3: Build predictions object ONLY for relevant stations
      const currentPredictions: Record<number, number> = {};

      // Only include relevant stations (not all 2787!)
      relevantStations.forEach(station => {
        // Use predicted SPI if available, otherwise default to 50
        currentPredictions[station.ID] = localPredictions.get(station.ID) || 50;
      });

      const predictedCount = Array.from(localPredictions.keys()).filter(id =>
        relevantStations.some(s => s.ID === id)
      ).length;

      console.log(`📊 Predicciones en estaciones relevantes: ${predictedCount}/${relevantStations.length}`);

      // Step 4: Call route API
      const result = await routeApi.suggestRoutes({
        origin_station: originId,
        destination_station: destinationId,
        current_predictions: currentPredictions,
        num_routes: 3,
      });

      setRouteData(result);
      setSelectedRouteIndex(0);

      // Notify parent about selected route
      if (onRouteSelect && result.routes.length > 0) {
        onRouteSelect(result.routes[0].stations);
      }
    } catch (err) {
      console.error('Error buscando rutas:', err);
      setError(err instanceof Error ? err.message : 'Error al buscar rutas');
    } finally {
      setLoading(false);
    }
  };

  const canSearch = originId !== null && destinationId !== null && originId !== destinationId;

  const isDataReady = (): boolean => {
    if (!originId || !destinationId) return false;

    const originSeq = currentSequences.get(originId);
    const destSeq = currentSequences.get(destinationId);

    if (!originSeq || !destSeq) return false;

    return originSeq.sequence.length >= 12 && destSeq.sequence.length >= 12;
  };

  const getDataStatus = (): string => {
    if (!originId || !destinationId) return '';

    const originSeq = currentSequences.get(originId);
    const destSeq = currentSequences.get(destinationId);

    if (!originSeq || !destSeq) return 'Esperando...';

    const minLength = Math.min(originSeq.sequence.length, destSeq.sequence.length);
    return `${minLength}/12 registros`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Form Section */}
      <div className="p-4 space-y-3 border-b">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Navigation className="h-4 w-4" />
          Buscar Rutas Alternativas
        </h3>

        {/* Origin Select */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Origen</label>
          <div className="space-y-1">
            <input
              type="text"
              placeholder="Buscar por nombre, ID o freeway..."
              value={searchOrigin}
              onChange={(e) => setSearchOrigin(e.target.value)}
              className="w-full px-3 py-2 text-xs border rounded-md"
            />
            <Select
              value={originId?.toString()}
              onValueChange={(value) => setOriginId(parseInt(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar estación origen" />
              </SelectTrigger>
              <SelectContent>
                {filteredOriginStations.length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground">
                    No se encontraron estaciones
                  </div>
                ) : (
                  filteredOriginStations.map((station) => (
                    <SelectItem
                      key={station.ID}
                      value={station.ID.toString()}
                      disabled={station.ID === destinationId}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-xs">{station.Name}</span>
                        <span className="text-xs text-muted-foreground">
                          ID: {station.ID} • Fwy {station.Fwy} {station.Dir}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Destination Select */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Destino</label>
          <div className="space-y-1">
            <input
              type="text"
              placeholder="Buscar por nombre, ID o freeway..."
              value={searchDestination}
              onChange={(e) => setSearchDestination(e.target.value)}
              className="w-full px-3 py-2 text-xs border rounded-md"
            />
            <Select
              value={destinationId?.toString()}
              onValueChange={(value) => setDestinationId(parseInt(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar estación destino" />
              </SelectTrigger>
              <SelectContent>
                {filteredDestinationStations.length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground">
                    No se encontraron estaciones
                  </div>
                ) : (
                  filteredDestinationStations.map((station) => (
                    <SelectItem
                      key={station.ID}
                      value={station.ID.toString()}
                      disabled={station.ID === originId}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-xs">{station.Name}</span>
                        <span className="text-xs text-muted-foreground">
                          ID: {station.ID} • Fwy {station.Fwy} {station.Dir}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search Button */}
        <Button
          onClick={handleSearchRoutes}
          disabled={!canSearch || loading || !isDataReady()}
          className="w-full"
          size="sm"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Buscando...
            </>
          ) : !isDataReady() && originId && destinationId ? (
            <>
              <Clock className="h-4 w-4 mr-2" />
              Generando datos...
            </>
          ) : (
            <>
              <Navigation className="h-4 w-4 mr-2" />
              Buscar Rutas
            </>
          )}
        </Button>

        {/* Data Status */}
        {originId && destinationId && !isDataReady() && (
          <div className="text-xs text-blue-600 flex items-center gap-1">
            <Clock className="h-3 w-3 animate-pulse" />
            Esperando datos de tráfico ({getDataStatus()})
          </div>
        )}

        {/* Validation Messages */}
        {originId === destinationId && originId !== null && (
          <div className="text-xs text-orange-600 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Origen y destino deben ser diferentes
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-medium text-red-800">Error</h4>
              <p className="text-xs text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      {routeData && (
        <div className="flex-1 overflow-y-auto">
          {/* Recommendation Banner */}
          <div className="p-3 bg-blue-50 border-b border-blue-200">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-900 font-medium">
                {routeData.recommendation}
              </p>
            </div>
          </div>

          {/* Route Tabs */}
          <div className="border-b">
            <div className="flex overflow-x-auto">
              {routeData.routes.map((route, index) => (
                <button
                  key={route.route_id}
                  onClick={() => {
                    setSelectedRouteIndex(index);
                    if (onRouteSelect) {
                      onRouteSelect(route.stations);
                    }
                  }}
                  className={`flex-1 min-w-[100px] px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                    selectedRouteIndex === index
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {route.route_name}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Route Details */}
          {routeData.routes[selectedRouteIndex] && (
            <div className="p-4 space-y-4">
              {/* Route Stats */}
              <div className={`rounded-lg border p-3 ${getStatusColor(routeData.routes[selectedRouteIndex].status)}`}>
                <div className="text-xs font-semibold mb-2">
                  Estado: {routeData.routes[selectedRouteIndex].status.toUpperCase()}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{routeData.routes[selectedRouteIndex].total_time_minutes.toFixed(1)} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Navigation className="h-3 w-3" />
                    <span>{routeData.routes[selectedRouteIndex].total_distance_km.toFixed(1)} km</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    <span>SPI avg: {routeData.routes[selectedRouteIndex].avg_spi.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{routeData.routes[selectedRouteIndex].congestion_percentage.toFixed(0)}% congestión</span>
                  </div>
                </div>
              </div>

              {/* Route Segments */}
              <div>
                <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Segmentos de Ruta ({routeData.routes[selectedRouteIndex].num_stations} estaciones)
                </h4>
                <div className="space-y-2">
                  {routeData.routes[selectedRouteIndex].stations.map((stationId, idx) => {
                    const station = stations.find(s => s.ID === stationId);
                    const spiValue = predictions.get(stationId)?.spi_predicted || 50;
                    const isOrigin = idx === 0;
                    const isDestination = idx === routeData.routes[selectedRouteIndex].stations.length - 1;

                    return (
                      <div key={stationId} className="relative">
                        <div className="flex items-start gap-2">
                          {/* Station Marker */}
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                            isOrigin ? 'bg-green-600' :
                            isDestination ? 'bg-red-600' :
                            getSPIColor(spiValue)
                          }`}>
                            {idx + 1}
                          </div>

                          {/* Station Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium truncate">
                                  {station?.Name || `Estación ${stationId}`}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {isOrigin && '🟢 Origen'}
                                  {isDestination && '🔴 Destino'}
                                  {!isOrigin && !isDestination && (
                                    <span className={getSPITextColor(spiValue)}>
                                      SPI: {spiValue.toFixed(1)} • {getSPILabel(spiValue)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Connector Line */}
                        {!isDestination && (
                          <div className={`ml-3 w-0.5 h-4 ${getSPIColor(spiValue)}`}></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Graph Stats */}
              {routeData.graph_stats && (
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Red: {routeData.graph_stats.nodes} estaciones, {routeData.graph_stats.edges} conexiones
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!routeData && !loading && !error && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Navigation className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              Selecciona origen y destino
            </p>
            <p className="text-xs text-muted-foreground">
              para buscar rutas alternativas
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteComparison;
