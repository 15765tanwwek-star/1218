export interface AppConfig {
  particleCount: number;
  particleSize: number;
  rotationSpeed: number;
  cakeColor: string;
  icingColor: string;
  bloomIntensity: number;
  bloomThreshold: number;
  sparkleSpeed: number;
}

export type AnimationPhase = '3' | '2' | '1' | 'cake';
export type CandleState = 'lit' | 'blowing' | 'extinguished';

export const DEFAULT_CONFIG: AppConfig = {
  particleCount: 25000,
  particleSize: 0.15,
  rotationSpeed: 0.25,
  cakeColor: '#2C1B18', // Dark Chocolate / Black Forest
  icingColor: '#FFD700', // Gold Leaf
  bloomIntensity: 1.8,
  bloomThreshold: 0.15,
  sparkleSpeed: 1.2,
};
