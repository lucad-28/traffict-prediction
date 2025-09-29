'use client';

import { useState } from 'react';
import { TrafficStation } from '@/data/stations';
import { PredictionResponse } from '@/services/predictionApi';
import { TrafficData } from '@/utils/trafficGenerator';

interface SidebarProps {
  stations: TrafficStation[];
  selectedStation: TrafficStation | null;
  onStationSelect: (station: TrafficStation) => void;
  onPredict: (station: TrafficStation) => void;
  prediction: PredictionResponse | null;
  currentSequence: TrafficData[] | null;
  isLoading: boolean;
  error: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({
  stations,
  selectedStation,
  onStationSelect,
  onPredict,
  prediction,
  currentSequence,
  isLoading,
  error
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const getCongestionColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-green-500';
      case 1: return 'bg-yellow-500';
      case 2: return 'bg-orange-500';
      case 3: return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getCongestionLabel = (level: number) => {
    switch (level) {
      case 0: return 'Free Flow';
      case 1: return 'Light Traffic';
      case 2: return 'Heavy Traffic';
      case 3: return 'Congested';
      default: return 'Unknown';
    }
  };

  return (
    <div className={`bg-white shadow-lg transition-all duration-300 ${isExpanded ? 'w-full lg:w-80' : 'w-12'} flex flex-col h-auto lg:h-full`}>
      {/* Header */}
      <div className="p-4 border-b bg-blue-600 text-white">
        <div className="flex items-center justify-between">
          {isExpanded && (
            <h1 className="text-lg font-semibold">Traffic Prediction</h1>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-blue-700 rounded"
          >
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Station Selection */}
          <div className="p-4 border-b">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Station
            </label>
            <select
              value={selectedStation?.id || ''}
              onChange={(e) => {
                const station = stations.find(s => s.id === e.target.value);
                if (station) onStationSelect(station);
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            >
              <option value="">Choose a station...</option>
              {stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </select>
          </div>

          {/* Predict Button */}
          {selectedStation && (
            <div className="p-4 border-b">
              <button
                onClick={() => onPredict(selectedStation)}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Predicting...' : 'Predict Traffic'}
              </button>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 border-b">
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex">
                  <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results Panel */}
          {prediction && selectedStation && (
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Prediction Results</h3>

              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="text-sm text-gray-600">Station</div>
                  <div className="font-medium">{selectedStation.name}</div>
                </div>

                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="text-sm text-gray-600">Congestion Level</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-3 h-3 rounded-full ${getCongestionColor(prediction.congestion_level)}`}></span>
                    <span className="font-medium">{getCongestionLabel(prediction.congestion_level)}</span>
                    <span className="text-sm text-gray-500">({prediction.congestion_level})</span>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="text-sm text-gray-600">SPI Predicted</div>
                  <div className="font-medium text-lg">{prediction.spi_predicted.toFixed(3)}</div>
                </div>

                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="text-sm text-gray-600">Status</div>
                  <div className="font-medium">{prediction.status}</div>
                </div>
              </div>
            </div>
          )}

          {/* Current Traffic Data */}
          {currentSequence && selectedStation && (
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Current Traffic Data</h3>

              <div className="space-y-2">
                {currentSequence.slice(-3).map((data, index) => (
                  <div key={index} className="bg-blue-50 p-3 rounded-md text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-600">Flow:</span>
                        <span className="ml-1 font-medium text-blue-600">{Math.round(data.totalFlow)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Speed:</span>
                        <span className="ml-1 font-medium text-blue-600">{Math.round(data.avgSpeed)} mph</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Occupancy:</span>
                        <span className="ml-1 font-medium text-blue-600">{(data.avgOccupancy * 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Hour:</span>
                        <span className="ml-1 font-medium text-blue-600">{data.hour}:00</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-xs text-gray-500">
                Showing last 3 data points from 12-sequence prediction input
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Sidebar;