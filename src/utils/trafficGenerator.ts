import { TrafficStation } from '@/data/stations';

export interface TrafficData {
  totalFlow: number;
  avgOccupancy: number;
  avgSpeed: number;
  hour: number;
  dayOfWeek: number;
  lanes: number;
  laneType: number;
  timestamp: Date;
}

export interface TrafficSequence {
  stationId: number;
  sequence: TrafficData[];
  timestamp: number;
}

export class TrafficDataGenerator {
  private lastSequences: Map<number, TrafficData[]> = new Map();

  generateSequence(station: TrafficStation, isInitial: boolean = false): TrafficSequence {
    const now = new Date();
    let sequence: TrafficData[];

    if (isInitial || !this.lastSequences.has(station.ID)) {
      // Generar secuencia inicial completa de 12 registros
      sequence = [];
      let previousData: TrafficData | null = null;

      for (let i = 11; i >= 0; i--) {
        const timeOffset = new Date(now.getTime() - (i * 5 * 60 * 1000));
        const newData = this.generateDataPoint(station, timeOffset, previousData);
        sequence.push(newData);
        previousData = newData;
      }
    } else {
      // Obtener secuencia existente
      const existingSequence = this.lastSequences.get(station.ID)!;

      // Generar un nuevo punto de datos
      const previousData = existingSequence[existingSequence.length - 1];
      const newData = this.generateDataPoint(station, now, previousData);

      // Ventana deslizante: eliminar el más antiguo y agregar el nuevo
      sequence = [...existingSequence.slice(1), newData];
    }

    this.lastSequences.set(station.ID, sequence);

    return {
      stationId: station.ID,
      sequence,
      timestamp: Date.now()
    };
  }

  private generateDataPoint(
    station: TrafficStation,
    timestamp: Date,
    previousData: TrafficData | null
  ): TrafficData {
    const sequenceHour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();
    const timeSlot = this.getTimeSlot(sequenceHour);

    const baseFlow = this.generateFlow(timeSlot, station.Lanes);
    const baseOccupancy = this.generateOccupancy(timeSlot);
    const baseSpeed = this.generateSpeed(timeSlot);

    const newData: TrafficData = {
      totalFlow: this.applyGradualChange(previousData?.totalFlow || baseFlow, baseFlow, 0.15),
      avgOccupancy: this.applyGradualChange(previousData?.avgOccupancy || baseOccupancy, baseOccupancy, 0.15),
      avgSpeed: this.applyGradualChange(previousData?.avgSpeed || baseSpeed, baseSpeed, 0.15),
      hour: sequenceHour,
      dayOfWeek: dayOfWeek,
      lanes: station.Lanes,
      laneType: station.Type === 'ML' ? 1 : station.Type === 'HV' ? 0 : 2,
      timestamp: timestamp
    };

    newData.avgSpeed = this.adjustSpeedBasedOnCorrelation(newData.totalFlow, newData.avgOccupancy);

    return newData;
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

  private getLastDataPoint(stationId: number): TrafficData | null {
    const lastSequence = this.lastSequences.get(stationId);
    if (lastSequence && lastSequence.length > 0) {
      return lastSequence[lastSequence.length - 1];
    }

    return null;
  }

  private randomBetween(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  generateForAllStations(stations: TrafficStation[], isInitial: boolean = false): TrafficSequence[] {
    return stations.map(station => this.generateSequence(station, isInitial));
  }
}