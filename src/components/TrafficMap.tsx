
'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { TrafficStation } from '@/data/stations';
import { PredictionResponse } from '@/services/predictionApi';
import { MapPin, Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Dynamic imports for Leaflet components (SSR safe)
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-200 animate-pulse rounded flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /> Loading map...</div>
});
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });

// MarkerClusterGroup for better performance with many stations
const MarkerClusterGroup = dynamic(
  () => import('react-leaflet-markercluster').then(mod => mod.default),
  { ssr: false }
) as React.ComponentType<React.PropsWithChildren<unknown>>;


interface TrafficMapProps {
  stations: TrafficStation[];
  predictions: Map<number, PredictionResponse>;
  onStationSelect: (station: TrafficStation) => void;
  selectedStationId?: number;
  showLegend?: boolean;
  className?: string;
  selectedRoute?: number[] | null;
}


const getColor = (level: number) => {
  switch (level) {
    case 0: return '#388E3C'; // Very smooth - Green
    case 1: return '#FBC02D'; // Smooth - Yellow
    case 2: return '#F57C00'; // Mild congestion - Orange
    case 3: return '#D32F2F'; // Heavy congestion - Red
    default: return '#6b7280'; // gray
  }
};

const getCongestionLabel = (level: number) => {
  switch (level) {
    case 0: return 'Very Smooth';
    case 1: return 'Smooth';
    case 2: return 'Mild Congestion';
    case 3: return 'Heavy Congestion';
    default: return 'Unknown';
  }
};

const getTypeLabel = (type: number) => {
  switch (type) {
    case 0: return 'Freeway';
    case 1: return 'Highway';
    case 2: return 'Arterial';
    case 3: return 'Local';
    default: return 'Unknown';
  }
};

const TrafficMap: React.FC<TrafficMapProps> = ({
  stations,
  predictions,
  onStationSelect,
  selectedStationId,
  showLegend = true,
  className = '',
  selectedRoute
}) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);


  if (!isClient) {
    return (
      <div className={`w-full h-full bg-gray-100 flex items-center justify-center ${className}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading map...</span>
        </div>
      </div>
    );
  }

  // Calculate map center based on stations
  const center: [number, number] = stations.length > 0
    ? [stations.reduce((sum, s) => sum + s.Latitude, 0) / stations.length,
       stations.reduce((sum, s) => sum + s.Longitude, 0) / stations.length]
    : [34.0522, -118.2437];

  return (
    <div className={`w-full h-full min-h-0 relative ${className}`}>
      {/* Legend */}
      {showLegend && stations.length > 0 && (
        <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-4 max-w-xs">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Traffic Levels
          </h3>
          <div className="space-y-2">
            {[0, 1, 2, 3].map((level) => (
              <div key={level} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full border-2 border-white"
                  style={{ backgroundColor: getColor(level) }}
                ></div>
                <span className="text-xs font-medium text-blue-950">{getCongestionLabel(level)}</span>
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-3 pt-2 border-t">
            {stations.length} stations • {predictions.size} with data
          </div>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={stations.length > 0 ? 11 : 10}
        style={{ position: 'absolute', inset: 0, height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Draw selected route */}
        {selectedRoute && selectedRoute.length > 1 && (
          <>
            {selectedRoute.map((stationId, index) => {
              if (index === selectedRoute.length - 1) return null;

              const currentStation = stations.find(s => s.ID === stationId);
              const nextStation = stations.find(s => s.ID === selectedRoute[index + 1]);

              if (!currentStation || !nextStation) return null;

              const prediction = predictions.get(nextStation.ID);
              const spi = prediction?.spi_predicted ?? 50;

              // Color based on SPI
              let color = '#22c55e'; // green
              if (spi < 25) color = '#ef4444'; // red
              else if (spi < 50) color = '#f97316'; // orange
              else if (spi < 75) color = '#3b82f6'; // blue

              return (
                <Polyline
                  key={`route-${stationId}-${nextStation.ID}`}
                  positions={[
                    [currentStation.Latitude, currentStation.Longitude],
                    [nextStation.Latitude, nextStation.Longitude]
                  ]}
                  pathOptions={{
                    color,
                    weight: 5,
                    opacity: 0.8,
                  }}
                />
              );
            })}
          </>
        )}

        <MarkerClusterGroup>
          {stations.map((station) => {
            const prediction = predictions.get(station.ID);
            const congestionLevel = prediction?.congestion_level ?? 0;
            const isSelected = selectedStationId === station.ID;

            return (
              <CircleMarker
                key={station.ID}
                center={[station.Latitude, station.Longitude]}
                radius={isSelected ? 12 : 8}
                color={getColor(congestionLevel)}
                fillColor={getColor(congestionLevel)}
                fillOpacity={0.8}
                weight={isSelected ? 4 : 2}
                eventHandlers={{
                  click: () => onStationSelect(station),
                  mouseover: (e) => {
                    e.target.setRadius(12);
                    e.target.setStyle({ weight: 4 });
                  },
                  mouseout: (e) => {
                    if (!isSelected) {
                      e.target.setRadius(8);
                      e.target.setStyle({ weight: 2 });
                    }
                  }
                }}
              >
                <Popup maxWidth={320} closeOnClick={false}>
                  <div className="min-w-[280px] p-2">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-base text-gray-900 leading-tight">
                        {station.Name}
                      </h3>
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm ml-2 flex-shrink-0"
                        style={{ backgroundColor: getColor(congestionLevel) }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <div className="text-gray-600">
                          <strong>Station ID:</strong> {station.ID}
                        </div>
                        <div className="text-gray-600">
                          <strong>Lanes:</strong> {station.Lanes}
                        </div>
                        <div className="text-gray-600">
                          <strong>Type:</strong> {getTypeLabel(station.Type === 'ML' ? 1 : station.Type === 'HV' ? 0 : 2)}
                        </div>
                      </div>

                      {prediction ? (
                        <div className="space-y-2">
                          <div className="text-gray-600">
                            <strong>SPI:</strong> {prediction.spi_predicted.toFixed(1)}
                          </div>
                          <div className="text-gray-600">
                            <strong>Estado:</strong> {prediction.fuzzy_classification?.dominant_label || getCongestionLabel(congestionLevel)}
                          </div>

                          {/* Mini fuzzy classification chart */}
                          {prediction.fuzzy_classification?.ranked_categories && (
                            <div className="mini-membership">
                              <div className="text-xs font-medium text-gray-700 mb-1">Grados de Pertenencia:</div>
                              {prediction.fuzzy_classification.ranked_categories.slice(0, 2).map((cat, index) => (
                                <div key={index} className="mini-bar">
                                  <span>{cat.label}</span>
                                  <div
                                    style={{
                                      width: `${Math.max(cat.membership * 60, 8)}px`,
                                      backgroundColor: cat.color
                                    }}
                                    title={`${Math.round(cat.membership * 100)}%`}
                                  ></div>
                                  <span className="text-xs">{Math.round(cat.membership * 100)}%</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Confidence level */}
                          {prediction.confidence_level && (
                            <div className="text-gray-600">
                              <strong>Confianza:</strong>
                              <span className={`ml-1 px-1 py-0.5 rounded text-xs font-medium ${
                                prediction.confidence_level === 'high' ? 'bg-green-100 text-green-800' :
                                prediction.confidence_level === 'medium' ? 'bg-orange-100 text-orange-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {prediction.confidence_level === 'high' ? 'Alta' :
                                 prediction.confidence_level === 'medium' ? 'Media' : 'Baja'}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-sm italic">
                          No prediction data
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t text-xs text-gray-500">
                      <strong>Coordinates:</strong> {station.Latitude.toFixed(4)}, {station.Longitude.toFixed(4)}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
};

export default TrafficMap;