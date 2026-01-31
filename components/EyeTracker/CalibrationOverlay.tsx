
import React, { useState, useEffect, useRef } from 'react';
import { useEyeTracker } from './EyeTrackerProvider';
import { TrackingEngine } from '../../services/trackingEngine';

const CALIBRATION_POINTS = [
  { x: '10%', y: '10%', label: 'Top Left' },
  { x: '90%', y: '10%', label: 'Top Right' },
  { x: '50%', y: '50%', label: 'Center' },
  { x: '10%', y: '90%', label: 'Bottom Left' },
  { x: '90%', y: '90%', label: 'Bottom Right' },
];

export const CalibrationOverlay: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { state } = useEyeTracker();
  const [pointIndex, setPointIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const engine = TrackingEngine.getInstance();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (pointIndex >= CALIBRATION_POINTS.length) {
      onComplete();
      return;
    }

    // Every frame, if the cursor is near the point, we "calibrate"
    const loop = () => {
      const raw = engine.getRawIris();
      if (raw && state.dwellProgress > 10) { // Using the existing dwell system's "focus" detection
        engine.updateCalibrationRange(raw.x, raw.y);
        setProgress(p => {
            const next = p + 1.5;
            if (next >= 100) {
                setPointIndex(i => i + 1);
                return 0;
            }
            return next;
        });
      }
      timerRef.current = requestAnimationFrame(loop);
    };

    timerRef.current = requestAnimationFrame(loop);
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [pointIndex, state.dwellProgress, onComplete, engine]);

  const currentPoint = CALIBRATION_POINTS[pointIndex];

  if (!currentPoint) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-500">
      <div className="text-center mb-48 max-w-md px-6">
        <h2 className="text-2xl font-bold text-white mb-2">Gaze Calibration</h2>
        <p className="text-slate-400 text-sm">
          Focus your eyes on the <span className="text-blue-400 font-bold uppercase">{currentPoint.label}</span> dot until it fills up.
        </p>
        <div className="mt-8 flex justify-center gap-2">
          {CALIBRATION_POINTS.map((_, i) => (
            <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === pointIndex ? 'w-8 bg-blue-500' : i < pointIndex ? 'w-4 bg-emerald-500' : 'w-4 bg-slate-800'
                }`}
            />
          ))}
        </div>
      </div>

      <div 
        className="fixed w-16 h-16 flex items-center justify-center transition-all duration-500 ease-out"
        style={{ left: currentPoint.x, top: currentPoint.y, transform: 'translate(-50%, -50%)' }}
      >
        <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 animate-ping" />
        <div className="absolute inset-0 rounded-full border-2 border-blue-500 animate-pulse" />
        
        <svg className="absolute inset-0 transform -rotate-90" width="64" height="64">
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="white"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={2 * Math.PI * 28}
            strokeDashoffset={2 * Math.PI * 28 * (1 - progress / 100)}
            strokeLinecap="round"
            className="transition-all duration-75"
          />
        </svg>
        <div className="w-4 h-4 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
      </div>

      <div className="fixed bottom-12 text-slate-500 text-[10px] uppercase tracking-[0.2em]">
        Move your head as little as possible
      </div>
    </div>
  );
};
