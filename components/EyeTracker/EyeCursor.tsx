
import React from 'react';
import { useEyeTracker } from './EyeTrackerProvider';

export const EyeCursor: React.FC = () => {
  const { state } = useEyeTracker();

  if (!state.isEnabled) return null;

  const { position, dwellProgress, targetElement } = state;
  const size = 48;
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (dwellProgress / 100) * circumference;

  const isDwellActive = dwellProgress > 0 && dwellProgress < 100;
  const isComplete = dwellProgress >= 100;

  return (
    <div
      className="fixed pointer-events-none z-[9999] flex items-center justify-center"
      style={{
        left: position.x - size / 2,
        top: position.y - size / 2,
        width: size,
        height: size,
        transition: 'transform 0.1s ease-out',
      }}
    >
      {/* Outer Glow Ring */}
      <div className={`absolute inset-0 rounded-full transition-all duration-300 ${
        isComplete ? 'bg-green-500/20 scale-125' : 
        targetElement ? 'bg-blue-500/10 scale-110' : 'bg-white/5'
      }`} />

      {/* SVG Progress Indicator */}
      <svg className="absolute inset-0 transform -rotate-90" width={size} height={size}>
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="3"
          fill="transparent"
        />
        {/* Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isComplete ? '#22c55e' : '#3b82f6'}
          strokeWidth="3"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-75"
        />
      </svg>

      {/* Center Dot */}
      <div className={`w-3 h-3 rounded-full transition-all duration-200 ${
        isComplete ? 'bg-green-400 scale-150' : 
        targetElement ? 'bg-blue-400 scale-125' : 'bg-white'
      }`} />

      {/* Tooltip / Status */}
      {targetElement && dwellProgress < 100 && (
        <div className="absolute top-full mt-2 bg-slate-900/80 backdrop-blur text-[10px] px-2 py-0.5 rounded text-white border border-white/10 uppercase tracking-widest">
          {Math.round(dwellProgress)}%
        </div>
      )}
    </div>
  );
};
