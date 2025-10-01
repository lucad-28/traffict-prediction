export interface TrafficStation {
  ID: number;           // ID de la estación
  Fwy: number;          // Número de autopista (5, 101, 405, etc.)
  Dir: string;          // Dirección (N, S, E, W)
  District: number;     // Distrito administrativo
  County: number;       // Condado
  City: number;         // Ciudad
  State_PM: number;     // State Postmile
  Abs_PM: number;       // Absolute Postmile
  Latitude: number;     // Latitud
  Longitude: number;    // Longitud
  Type: string;         // Tipo de carril (ML, HV, OR, FR)
  Lanes: number;        // Número de carriles
  Name: string;         // Nombre descriptivo de la ubicación
}
