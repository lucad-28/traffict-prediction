'use client';

import { TrafficStation } from '@/data/stations';
import { PredictionResponse } from '@/services/predictionApi';
import { TrafficData } from '@/utils/trafficGenerator';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  MapPin,
  Activity,
  Clock,
  AlertTriangle,
  Loader2,
  BarChart3,
  Navigation,
} from 'lucide-react';

interface TrafficSidebarProps {
  stations: TrafficStation[];
  selectedStation: TrafficStation | null;
  onStationSelect: (station: TrafficStation) => void;
  onPredict: (station: TrafficStation) => void;
  prediction: PredictionResponse | null;
  currentSequence: TrafficData[] | null;
  isLoading: boolean;
  error: string | null;
}

const TrafficSidebar: React.FC<TrafficSidebarProps> = ({
  stations,
  selectedStation,
  onStationSelect,
  onPredict,
  prediction,
  currentSequence,
  isLoading,
  error
}) => {
  const getCongestionColor = (level: number) => {
    switch (level) {
      case 0: return 'text-green-600';
      case 1: return 'text-yellow-600';
      case 2: return 'text-orange-600';
      case 3: return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getCongestionBgColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-green-100';
      case 1: return 'bg-yellow-100';
      case 2: return 'bg-orange-100';
      case 3: return 'bg-red-100';
      default: return 'bg-gray-100';
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

  const getTypeLabel = (type: number) => {
    switch (type) {
      case 0: return 'Freeway';
      case 1: return 'Highway';
      case 2: return 'Arterial';
      case 3: return 'Local';
      default: return 'Unknown';
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r lg:w-80">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2">
          <Activity className="h-6 w-6 text-blue-600" />
          <h1 className="text-lg font-semibold text-gray-900 group-data-[collapsible=icon]:hidden">
            Traffic Prediction
          </h1>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Station Selection */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Traffic Stations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {stations.map((station) => (
                <SidebarMenuItem key={station.id}>
                  <SidebarMenuButton
                    onClick={() => onStationSelect(station)}
                    isActive={selectedStation?.id === station.id}
                    className="flex-col items-start p-3 h-auto group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:h-8"
                    tooltip={station.name}
                  >
                    <div className="flex items-center gap-2 w-full group-data-[collapsible=icon]:justify-center">
                      <Navigation className="h-4 w-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                        <div className="font-medium text-sm truncate">
                          {station.name}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>{station.lanes} lanes</span>
                          <span>•</span>
                          <span>{getTypeLabel(station.type)}</span>
                        </div>
                      </div>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Selected Station Actions */}
        {selectedStation && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Prediction
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="p-2 space-y-3">
                <div className="group-data-[collapsible=icon]:hidden">
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {selectedStation.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Station ID: {selectedStation.id}
                  </div>
                </div>

                <Button
                  onClick={() => onPredict(selectedStation)}
                  disabled={isLoading}
                  className="w-full group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:h-8"
                  size="sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin group-data-[collapsible=icon]:mr-0 mr-2" />
                      <span className="group-data-[collapsible=icon]:hidden">Predicting...</span>
                    </>
                  ) : (
                    <>
                      <Activity className="h-4 w-4 group-data-[collapsible=icon]:mr-0 mr-2" />
                      <span className="group-data-[collapsible=icon]:hidden">Predict Traffic</span>
                    </>
                  )}
                </Button>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Error Display */}
        {error && (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="p-2">
                <div className="bg-red-50 border border-red-200 rounded-md p-3 group-data-[collapsible=icon]:p-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="group-data-[collapsible=icon]:hidden">
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Prediction Results */}
        {prediction && selectedStation && (
          <SidebarGroup>
            <SidebarGroupLabel>Results</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="p-2 space-y-3 group-data-[collapsible=icon]:space-y-1">
                <div className={`rounded-md p-3 group-data-[collapsible=icon]:p-2 ${getCongestionBgColor(prediction.congestion_level)}`}>
                  <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                    <div className={`w-3 h-3 rounded-full ${prediction.congestion_level === 0 ? 'bg-green-500' :
                      prediction.congestion_level === 1 ? 'bg-yellow-500' :
                      prediction.congestion_level === 2 ? 'bg-orange-500' : 'bg-red-500'}`}></div>
                    <div className="group-data-[collapsible=icon]:hidden">
                      <div className="text-sm font-medium">
                        {getCongestionLabel(prediction.congestion_level)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Level {prediction.congestion_level}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="group-data-[collapsible=icon]:hidden space-y-2">
                  <div className="bg-gray-50 rounded-md p-3">
                    <div className="text-xs text-muted-foreground">SPI Predicted</div>
                    <div className="text-lg font-bold">{prediction.spi_predicted.toFixed(3)}</div>
                  </div>

                  <div className="bg-gray-50 rounded-md p-3">
                    <div className="text-xs text-muted-foreground">Status</div>
                    <div className="text-sm font-medium">{prediction.status}</div>
                  </div>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Current Traffic Data */}
        {currentSequence && selectedStation && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Data
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="p-2 space-y-2 group-data-[collapsible=icon]:hidden">
                {currentSequence.slice(-3).map((data, index) => (
                  <div key={index} className="bg-blue-50 rounded-md p-3 text-sm">
                    <div className="flex flex-col lg:grid lg:grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground">Flow:</span>
                        <span className="ml-1 font-medium text-blue-600">
                          {Math.round(data.totalFlow)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Speed:</span>
                        <span className="ml-1 font-medium text-blue-600">
                          {Math.round(data.avgSpeed)} mph
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Occupancy:</span>
                        <span className="ml-1 font-medium text-blue-600">
                          {(data.avgOccupancy * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Hour:</span>
                        <span className="ml-1 font-medium text-blue-600">
                          {data.hour}:00
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="text-xs text-muted-foreground mt-2">
                  Last 3 data points from sequence
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
};

export default TrafficSidebar;