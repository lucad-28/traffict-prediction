export interface TrafficStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lanes: number;
  type: number;
}

export const trafficStations: TrafficStation[] = [
  {
    id: "401234",
    name: "I-405 N at Sunset",
    lat: 34.0522,
    lng: -118.2437,
    lanes: 5,
    type: 0
  },
  {
    id: "401235",
    name: "I-405 S at Wilshire",
    lat: 34.0612,
    lng: -118.4451,
    lanes: 4,
    type: 0
  },
  {
    id: "401236",
    name: "I-10 E at La Brea",
    lat: 34.0498,
    lng: -118.3443,
    lanes: 6,
    type: 0
  },
  {
    id: "401237",
    name: "SR-110 N at Adams",
    lat: 34.0294,
    lng: -118.2654,
    lanes: 4,
    type: 1
  },
  {
    id: "401238",
    name: "I-5 S at Stadium",
    lat: 34.0750,
    lng: -118.2357,
    lanes: 5,
    type: 0
  },
  {
    id: "401239",
    name: "US-101 N at Vermont",
    lat: 34.0933,
    lng: -118.2915,
    lanes: 4,
    type: 0
  },
  {
    id: "401240",
    name: "I-110 S at Manchester",
    lat: 33.9592,
    lng: -118.2784,
    lanes: 3,
    type: 2
  },
  {
    id: "401241",
    name: "I-710 N at Imperial",
    lat: 33.9290,
    lng: -118.1701,
    lanes: 5,
    type: 0
  },
  {
    id: "401242",
    name: "SR-91 E at Downey",
    lat: 33.9403,
    lng: -118.1332,
    lanes: 6,
    type: 0
  },
  {
    id: "401243",
    name: "I-605 N at Whittier",
    lat: 34.0058,
    lng: -118.0672,
    lanes: 4,
    type: 3
  }
];