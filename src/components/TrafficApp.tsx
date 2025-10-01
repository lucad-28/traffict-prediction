"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { TrafficStation } from "@/data/stations";
import {
  TrafficDataGenerator,
  TrafficSequence,
  TrafficData,
} from "@/utils/trafficGenerator";
import {
  PredictionApiService,
  PredictionResponse,
} from "@/services/predictionApi";
import TrafficSidebar from "./TrafficSidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { StationsApiService } from "@/services/stationsApi";

const TrafficMap = dynamic(() => import("./TrafficMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <div className="text-gray-500">Loading map...</div>
    </div>
  ),
});

const TrafficApp: React.FC = () => {
  const [trafficStations, setTrafficStations] = useState<TrafficStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<TrafficStation | null>(
    null
  );
  const [predictions, setPredictions] = useState<
    Map<number, PredictionResponse>
  >(new Map());
  const [currentSequences, setCurrentSequences] = useState<
    Map<number, TrafficSequence>
  >(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<number>(0);
  const [selectedRoute, setSelectedRoute] = useState<number[] | null>(null);

  const predictionApi = new PredictionApiService();
  const stationsApi = new StationsApiService();
  const trafficGenerator = useState(() => new TrafficDataGenerator())[0];

  const generateSequencesForAllStations = useCallback((isInitial: boolean = false) => {
    if (trafficStations.length === 0) return;

    const sequences = trafficGenerator.generateForAllStations(trafficStations, isInitial);
    const sequenceMap = new Map<number, TrafficSequence>();

    sequences.forEach((sequence) => {
      sequenceMap.set(sequence.stationId, sequence);
    });

    setCurrentSequences(sequenceMap);
    setLastGenerated(Date.now());
  }, [trafficStations, trafficGenerator]);

  const handlePredict = async (station: TrafficStation): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const sequence = currentSequences.get(station.ID);
      if (!sequence) {
        throw new Error("No traffic data available for this station");
      }

      const prediction = await predictionApi.predict(sequence.sequence);

      setPredictions((prev) => {
        const newPredictions = new Map(prev);
        newPredictions.set(station.ID, prediction);
        return newPredictions;
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get prediction";
      setError(errorMessage);
      console.error("Prediction error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStationSelect = (station: TrafficStation) => {
    setSelectedStation(station);
    setError(null);
  };

  useEffect(() => {
    const fetchStations = async () => {
      try {
        console.info("Fetching traffic stations...");
        const response = await stationsApi.getAllStations();
        setTrafficStations(response.stations);
      } catch (err) {
        console.error('Error fetching stations:', err);
        setError('Failed to load traffic stations');
      }
    };

    fetchStations();
  }, []);

  useEffect(() => {
    if (trafficStations.length === 0) return;

    // Generar secuencia inicial completa
    generateSequencesForAllStations(true);

    // Cada 5 minutos, agregar solo un nuevo punto de datos
    const interval = setInterval(() => {
      generateSequencesForAllStations(false);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [generateSequencesForAllStations]);

  const getCurrentSequence = (): TrafficData[] | null => {
    if (!selectedStation) return null;
    const sequence = currentSequences.get(selectedStation.ID);
    return sequence?.sequence || null;
  };

  const getCurrentPrediction = (): PredictionResponse | null => {
    if (!selectedStation) return null;
    return predictions.get(selectedStation.ID) || null;
  };

  const formatLastGenerated = (): string => {
    if (!lastGenerated) return "Never";
    const now = Date.now();
    const diff = Math.floor((now - lastGenerated) / 1000);

    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    return `${Math.floor(diff / 3600)} hours ago`;
  };

  // SSR safety: only render map on client
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <SidebarProvider>
      <div className="h-screen flex bg-gray-100 overflow-hidden w-screen">
        <TrafficSidebar
          stations={trafficStations}
          selectedStation={selectedStation}
          onStationSelect={handleStationSelect}
          onPredict={handlePredict}
          prediction={getCurrentPrediction()}
          currentSequence={getCurrentSequence()}
          isLoading={isLoading}
          error={error}
          predictions={predictions}
          currentSequences={currentSequences}
          onRouteSelect={setSelectedRoute}
        />

        <SidebarInset className="flex-1 flex flex-col">
          {/* Header with sidebar toggle */}
          <header className="bg-white shadow-sm px-4 py-2 border-b flex-shrink-0">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="md:hidden" />
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 flex-1">
                <div className="flex items-center gap-3">
                  <SidebarTrigger className="hidden md:flex" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    California Traffic Monitoring System
                  </h2>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-xs sm:text-sm">Free Flow</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-xs sm:text-sm">Light</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-xs sm:text-sm">Heavy</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-xs sm:text-sm">Congested</span>
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm">
                    Last update: {formatLastGenerated()}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main map content */}
          <main className="flex-1 min-h-0 relative w-full">
            {isClient && (
              <TrafficMap
                stations={trafficStations}
                predictions={predictions}
                onStationSelect={handleStationSelect}
                selectedStationId={selectedStation?.ID}
                showLegend={false}
                selectedRoute={selectedRoute}
              />
            )}
          </main>

          {/* Footer */}
          <footer className="bg-white border-t px-4 py-2 flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-xs sm:text-sm text-gray-600">
              <div>
                {trafficStations.length} stations • {predictions.size} predictions
              </div>
              <div>Auto-refresh every 5 minutes</div>
            </div>
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default TrafficApp;
