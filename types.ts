
export interface Point {
  x: number;
  y: number;
}

export enum TrackingMode {
  GAZE = 'GAZE',
  MOUSE_SIMULATION = 'MOUSE_SIMULATION'
}

export interface EyeTrackerState {
  position: Point;
  isEnabled: boolean;
  isCalibrated: boolean;
  dwellProgress: number; // 0 to 100
  targetElement: HTMLElement | null;
  mode: TrackingMode;
}

export interface EyeTrackerConfig {
  dwellTimeMs: number;
  smoothingFactor: number;
  showVisuals: boolean;
  sensitivity: number;
}
