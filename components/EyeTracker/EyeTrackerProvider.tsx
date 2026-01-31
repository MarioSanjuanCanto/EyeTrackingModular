
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { EyeTrackerState, Point, TrackingMode } from '../../types';
import { DEFAULT_CONFIG, INTERACTIVE_SELECTORS } from '../../constants';
import { TrackingEngine } from '../../services/trackingEngine';

interface EyeTrackerContextValue {
  state: EyeTrackerState;
  setEnabled: (enabled: boolean) => void;
  setMode: (mode: TrackingMode) => void;
  resetCalibration: () => void;
  setCalibrated: (val: boolean) => void;
}

const EyeTrackerContext = createContext<EyeTrackerContextValue | undefined>(undefined);

export const EyeTrackerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<EyeTrackerState>({
    position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    isEnabled: false,
    isCalibrated: false,
    dwellProgress: 0,
    targetElement: null,
    mode: TrackingMode.MOUSE_SIMULATION, 
  });

  const engine = useRef<TrackingEngine>(TrackingEngine.getInstance());
  const requestRef = useRef<number | undefined>(undefined);
  const lastUpdateRef = useRef<number>(performance.now());
  
  const smoothedPos = useRef<Point>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  const updatePosition = useCallback((newPos: Point) => {
    const dx = newPos.x - smoothedPos.current.x;
    const dy = newPos.y - smoothedPos.current.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    // Low-pass filter smoothing
    // We use a slightly stronger smoothing for iris tracking because it's naturally jittery
    const smoothing = state.mode === TrackingMode.GAZE ? 0.08 : DEFAULT_CONFIG.smoothingFactor;
    
    smoothedPos.current = {
      x: smoothedPos.current.x + dx * smoothing,
      y: smoothedPos.current.y + dy * smoothing,
    };

    setState(prev => ({
      ...prev,
      