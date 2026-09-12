export type VehicleId = 'bike' | 'car' | 'spaceship';

export interface VehicleDefinition {
  id: VehicleId;
  name: string;
  blurb: string;
  icon: string;
}

/** Earned one per Chapter 1 lesson, in order - the reward for finishing it. */
export const VEHICLES: Record<VehicleId, VehicleDefinition> = {
  bike: {
    id: 'bike',
    name: 'Bike',
    blurb: 'Zips around the city on two wheels.',
    icon: '🚲',
  },
  car: {
    id: 'car',
    name: 'Car',
    blurb: 'A friendly runabout for longer trips.',
    icon: '🚗',
  },
  spaceship: {
    id: 'spaceship',
    name: 'Spaceship',
    blurb: 'Fast enough to reach the next chapter.',
    icon: '🚀',
  },
};
