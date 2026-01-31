
import React, { useState, useEffect, useRef } from 'react';
import { TrackingEngine } from '../../services/trackingEngine';

const CALIBRATION_POINTS = [
  { x: 0.1, y: 0.1, label: 'Top Left' },
  { x: 0.9, y: 0.1, label: 'Top Right' },
  { x: 0.5, y: 0.5, label: 'Center' },
  { x: 0.1, y: 0.9, label: 'Bottom Left' },
  { x: 0.9, y: 0.9, label: 'Bottom Right' },
];

const STARE_DURATION_MS = 2500; // Slightly longer for better sampling

export const CalibrationOverlay: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [pointIndex, setPointIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const engine = useRef(TrackingEngine.getInstance());
  const lastTimeRef = useRef<number>(performance.now());
  const requestRef = useRef<number | undefined>(undefined);
  
  // Buffer to store raw iris values for the current point to get a clean average
  const samplesRef = useRef<{x: number, y: number}[]>([]);

  useEffect(() => {
    engine.current.resetCalibration();
  }, []);

  useEffect(() => {
    if (pointIndex >= CALIBRATION_POINTS.length) {
      onComplete();
      return;
    }

    const loop = (time: number) => {
      const dt = time - lastTimeRef.current;
      lastTimeRef.current = time;

      const raw = engine.current.getRawIris();
      
      if (raw) {
        samplesRef.current.push(raw);
        
        setProgress(p => {
          const next = p + (dt / STARE_DURATION_MS) * 100;
          if (next >= 100) {
            // Average the samples for this point
            const avgX = samplesRef.current.reduce((a, b) => a + b.x, 0) / samplesRef.current.length;
            const avgY = samplesRef.current.reduce((a, b) => a + b.y, 0) / samplesRef.current.length;
            
            const target = CALIBRATION_POINTS[pointIndex];
            engine.current.recordCalibrationAnchor(target.x, target.y, avgX, avgY);
            
            samplesRef.current = [];
            setPointIndex(i => i + 1);
            return 0;
          }
          return next;
        });
      } else {
        setProgress(0);
        samplesRef.current = [];
      }
      
      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [pointIndex, onComplete]);

  const currentPoint = CALIBRATION_POINTS[pointIndex];
  if (!currentPoint) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/98 backdrop-blur-2xl flex items-center justify-center">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 blur-[180px] rounded-full"></div>
      </div>

      <div className="text-center mb-64 max-w-lg px-8 relative z-10 animate-in fade-in zoom-in duration-700">
        <div className="inline-block px-4 py-1.5 bg-blue-500/20 border border-blue-500/40 rounded-full text-blue-300 text-[10px] font-bold uppercase tracking-widest mb-8">
          Precision Calibration
        </div>
        <h2 className="text-5xl font-black text-white mb-6 tracking-tight">
          Look at the <span className="text-blue-500">{currentPoint.label}</span>
        </h2>
        <p className="text-slate-400 text-lg leading-relaxed font-medium">
          Follow the target with your eyes. <br/>
          <span className="text-blue-400/80 text-sm mt-2 block">Keep your head perfectly still.</span>
        </p>
        
        <div className="mt-16 flex justify-center gap-4">
          {CALIBRATION_POINTS.map((_, i) => (
            <div 
              key={i} 
              className={`h-2.5 rounded-full transition-all duration-700 shadow-lg ${
                i === pointIndex ? 'w-16 bg-blue-500 shadow-blue-500/40' : i < pointIndex ? 'w-8 bg-emerald-500 shadow-emerald-500/20' : 'w-8 bg-slate-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Target Dot */}
      <div 
        className="fixed w-28 h-28 flex items-center justify-center transition-all duration-1000 cubic-bezier(0.34, 1.56, 0.64, 1)"
        style={{ left: `${currentPoint.x * 100}%`, top: `${currentPoint.y * 100}%`, transform: 'translate(-50%, -50%)' }}
      >
        <div className="absolute inset-0 rounded-full border-4 border-blue-500/10 animate-pulse scale-110" />
        
        <svg className="absolute inset-0 transform -rotate-90" width="112" height="112">
          <circle
            cx="56"
            cy="56"
            r="48"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
            fill="transparent"
          />
          <circle
            cx="56"
            cy="56"
            r="48"
            stroke="white"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={2 * Math.PI * 48}
            strokeDashoffset={2 * Math.PI * 48 * (1 - progress / 100)}
            strokeLinecap="round"
            className="transition-all duration-150 ease-linear"
          />
        </svg>

        <div className="w-8 h-8 bg-white rounded-full shadow-[0_0_40px_rgba(255,255,255,0.8)] relative z-20 flex items-center justify-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
        </div>
      </div>

      <div className="fixed bottom-12 flex flex-col items-center gap-4">
        <div className="px-6 py-2 bg-slate-900/80 border border-slate-700 rounded-2xl backdrop-blur-md">
            <span className="text-slate-500 text-[11px] uppercase font-bold tracking-[0.3em]">
              Stabilizing Sensor Input...
            </span>
        </div>
        {!engine.current.getRawIris() && (
          <div className="text-rose-400 text-sm font-bold animate-bounce flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            FACE NOT DETECTED
          </div>
        )}
      </div>
    </div>
  );
};
