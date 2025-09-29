import { TrafficStation } from '@/data/stations';

export interface TrafficData {
  totalFlow: number;
  avgOccupancy: number;
  avgSpeed: number;
  hour: number;
  dayOfWeek: number;
  lanes: number;
  laneType: number;
}

export interface TrafficSequence {
  stationId: string;
  sequence: TrafficData[];
  timestamp: number;
}

export class TrafficDataGenerator {
  private lastSequences: Map<string, TrafficData[]> = new Map();

  generateSequence(station: TrafficStation): TrafficSequence {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    const sequence: TrafficData[] = [];
    let previousData = this.getLastDataPoint(station.id);

    for (let i = 0; i < 12; i++) {
      const sequenceHour = hour;
      const timeSlot = this.getTimeSlot(sequenceHour);

      const baseFlow = this.generateFlow(timeSlot, station.lanes);
      const baseOccupancy = this.generateOccupancy(timeSlot);
      const baseSpeed = this.generateSpeed(timeSlot);

      const newData: TrafficData = {
        totalFlow: this.applyGradualChange(previousData?.totalFlow || baseFlow, baseFlow, 0.15),
        avgOccupancy: this.applyGradualChange(previousData?.avgOccupancy || baseOccupancy, baseOccupancy, 0.15),
        avgSpeed: this.applyGradualChange(previousData?.avgSpeed || baseSpeed, baseSpeed, 0.15),
        hour: sequenceHour,
        dayOfWeek: dayOfWeek,
        lanes: station.lanes,
        laneType: station.type
      };

      newData.avgSpeed = this.adjustSpeedBasedOnCorrelation(newData.totalFlow, newData.avgOccupancy);

      sequence.push(newData);
      previousData = newData;
    }

    this.lastSequences.set(station.id, sequence);

    return {
      stationId: station.id,
      sequence,
      timestamp: Date.now()
    };
  }

  private getTimeSlot(hour: number): 'morning_peak' | 'day' | 'evening_peak' | 'night' {
    if (hour >= 7 && hour <= 9) return 'morning_peak';
    if (hour >= 17 && hour <= 19) return 'evening_peak';
    if (hour >= 22 || hour <= 5) return 'night';
    return 'day';
  }

  private generateFlow(timeSlot: string, lanes: number): number {
    const baseLaneCapacity = 100;
    const maxFlow = lanes * baseLaneCapacity;

    switch (timeSlot) {
      case 'morning_peak':
      case 'evening_peak':
        return this.randomBetween(280, Math.min(450, maxFlow));
      case 'night':
        return this.randomBetween(30, 100);
      case 'day':
      default:
        return this.randomBetween(150, 280);
    }
  }

  private generateOccupancy(timeSlot: string): number {
    switch (timeSlot) {
      case 'morning_peak':
      case 'evening_peak':
        return this.randomBetween(0.35, 0.75);
      case 'night':
        return this.randomBetween(0.03, 0.12);
      case 'day':
      default:
        return this.randomBetween(0.15, 0.35);
    }
  }

  private generateSpeed(timeSlot: string): number {
    switch (timeSlot) {
      case 'morning_peak':
      case 'evening_peak':
        return this.randomBetween(25, 45);
      case 'night':
        return this.randomBetween(65, 75);
      case 'day':
      default:
        return this.randomBetween(45, 65);
    }
  }

  private adjustSpeedBasedOnCorrelation(flow: number, occupancy: number): number {
    const congestionFactor = (flow / 500) + occupancy;
    const baseSpeed = 75;
    const minSpeed = 15;

    const adjustedSpeed = baseSpeed * (1 - congestionFactor * 0.8);
    return Math.max(minSpeed, Math.min(75, adjustedSpeed));
  }

  private applyGradualChange(previous: number, target: number, maxChangePercent: number): number {
    const maxChange = previous * maxChangePercent;
    const change = target - previous;

    if (Math.abs(change) <= maxChange) {
      return target;
    }

    return previous + (change > 0 ? maxChange : -maxChange);
  }

  private getLastDataPoint(stationId: string): TrafficData | null {
    const lastSequence = this.lastSequences.get(stationId);
    if (lastSequence && lastSequence.length > 0) {
      return lastSequence[lastSequence.length - 1];
    }

    return null;
  }

  private randomBetween(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  generateForAllStations(stations: TrafficStation[]): TrafficSequence[] {
    return stations.map(station => this.generateSequence(station));
  }
}