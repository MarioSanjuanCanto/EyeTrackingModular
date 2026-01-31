
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
  
  // High-precision smoothing refs
  const smoothedPos = useRef<Point>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const velocity = useRef<Point>({ x: 0, y: 0 });

  const updatePosition = useCallback((newPos: Point) => {
    // Dynamic smoothing based on distance (Faster movement = less smoothing)
    const dx = newPos.x - smoothedPos.current.x;
    const dy = newPos.y - smoothedPos.current.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    // Smooth factor increases with distance to reduce lag during big jumps
    // but stays low for precision during small movements
    const baseSmoothing = DEFAULT_CONFIG.smoothingFactor;
    const adaptiveFactor = Math.min(0.5, baseSmoothing + (dist / 1000) * 0.2);
    
    smoothedPos.current = {
      x: smoothedPos.current.x + dx * adaptiveFactor,
      y: smoothedPos.current.y + dy * adaptiveFactor,
    };

    setState(prev => ({
      ...prev,
      position: smoothedPos.current,
    }));
  }, []);

  useEffect(() => {
    if (state.mode === TrackingMode.GAZE && state.isEnabled) {
      engine.current.initialize().then(() => {
        engine.current.setCallback((point) => {
          if (point) updatePosition(point);
        });
      }).catch(err => {
        console.error("Failed to init MediaPipe Engine:", err);
      });
    } else {
      engine.current.pause();
    }

    return () => {
      engine.current.pause();
    };
  }, [state.mode, state.isEnabled, updatePosition]);

  useEffect(() => {
    if (state.mode === TrackingMode.MOUSE_SIMULATION && state.isEnabled) {
      const handleMouseMove = (e: MouseEvent) => {
        updatePosition({ x: e.clientX, y: e.clientY });
      };
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [state.mode, state.isEnabled, updatePosition]);

  useEffect(() => {
    if (!state.isEnabled) return;

    const dwellLoop = (time: number) => {
      const deltaTime = time - lastUpdateRef.current;
      lastUpdateRef.current = time;

      const el = document.elementFromPoint(state.position.x, state.position.y) as HTMLElement | null;
      const interactiveEl = el?.closest(INTERACTIVE_SELECTORS.join(', ')) as HTMLElement | null;

      setState(prev => {
        if (interactiveEl !== prev.targetElement) {
          return {
            ...prev,
            targetElement: interactiveEl,
            dwellProgress: 0,
          };
        }

        if (interactiveEl) {
          const newProgress = Math.min(100, prev.dwellProgress + (deltaTime / DEFAULT_CONFIG.dwellTimeMs) * 100);
          
          if (newProgress >= 100 && prev.dwellProgress < 100) {
            interactiveEl.click();
            return { ...prev, dwellProgress: 100 }; 
          }

          return { ...prev, dwellProgress: newProgress };
        }

        return { ...prev, dwellProgress: 0 };
      });

      requestRef.current = requestAnimationFrame(dwellLoop);
    };

    requestRef.current = requestAnimationFrame(dwellLoop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [state.position.x, state.position.y, state.isEnabled]);

  const setEnabled = (enabled: boolean) => setState(p => ({ ...p, isEnabled: enabled }));
  const setMode = (mode: TrackingMode) => setState(p => ({ ...p, mode }));
  const resetCalibration = () => {
    engine.current.resetCalibration();
    setState(p => ({ ...p, isCalibrated: false }));
  };
  const setCalibrated = (val: boolean) => setState(p => ({ ...p, isCalibrated: val }));

  return (
    <EyeTrackerContext.Provider value={{ state, setEnabled, setMode, resetCalibration, setCalibrated }}>
      {children}
    </EyeTrackerContext.Provider>
  );
};

export const useEyeTracker = () => {
  const context = useContext(EyeTrackerContext);
  if (!context) throw new Error('useEyeTracker must be used within EyeTrackerProvider');
  return context;
};
