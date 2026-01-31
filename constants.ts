
import { EyeTrackerConfig } from './types';

export const DEFAULT_CONFIG: EyeTrackerConfig = {
  dwellTimeMs: 3000,
  smoothingFactor: 0.15,
  showVisuals: true,
  sensitivity: 1.0,
};

export const INTERACTIVE_SELECTORS = [
  'button',
  'a',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[data-dwellable="true"]'
];
