
import React, { useState, useEffect } from 'react';
import { useEyeTracker } from './EyeTracker/EyeTrackerProvider';
import { TrackingMode } from '../types';
import { CalibrationOverlay } from './EyeTracker/CalibrationOverlay';

export const TestDashboard: React.FC = () => {
  const { state, setEnabled, setMode, resetCalibration, setCalibrated } = useEyeTracker();
  const [clickCount, setClickCount] = useState(0);
  const [lastAction, setLastAction] = useState('None');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);

  const handleAction = (name: string) => {
    setClickCount(prev => prev + 1);
    setLastAction(name);
  };

  useEffect(() => {
    if (state.mode === TrackingMode.GAZE && state.isEnabled) {
      setIsCameraActive(true);
    } else {
      setIsCameraActive(false);
      setShowCalibration(false);
    }
  }, [state.mode, state.isEnabled]);

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto flex flex-col gap-8">
      {showCalibration && (
        <CalibrationOverlay 
          onComplete={() => {
            setShowCalibration(false);
            setCalibrated(true);
          }} 
        />
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-500/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              Ocular AI
            </h1>
            <p className="text-slate-400 text-sm mt-1">MediaPipe Precision Interface</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {state.mode === TrackingMode.GAZE && state.isEnabled && !state.isCalibrated && (
            <button
                onClick={() => setShowCalibration(true)}
                className="px-6 py-2 rounded-xl font-bold bg-blue-500 text-white animate-pulse shadow-lg shadow-blue-500/20 hover:bg-blue-400 transition-all"
            >
                Start Calibration
            </button>
          )}

          <button
            onClick={() => setEnabled(!state.isEnabled)}
            className={`px-6 py-2 rounded-xl font-medium transition-all ${
              state.isEnabled 
                ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' 
                : 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30'
            }`}
          >
            {state.isEnabled ? 'Stop Tracker' : 'Start Tracker'}
          </button>

          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setMode(TrackingMode.MOUSE_SIMULATION)}
              className={`px-4 py-1.5 rounded-lg text-sm transition-all ${
                state.mode === TrackingMode.MOUSE_SIMULATION ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sim
            </button>
            <button
              onClick={() => setMode(TrackingMode.GAZE)}
              className={`px-4 py-1.5 rounded-lg text-sm transition-all ${
                state.mode === TrackingMode.GAZE ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Iris
            </button>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-200">System Feed</h2>
              {isCameraActive && (
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${state.isCalibrated ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                  <span className={`text-[10px] uppercase font-bold ${state.isCalibrated ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {state.isCalibrated ? 'Calibrated' : 'Needs Calib'}
                  </span>
                </div>
              )}
            </div>
            
            {isCameraActive ? (
              <div className="aspect-video bg-slate-900 rounded-xl border border-slate-700 flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-blue-500/5 flex flex-col items-center justify-center p-4 text-center">
                  <svg className="w-12 h-12 text-slate-700 mb-2 group-hover:text-blue-500/20 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-slate-500 text-[10px] uppercase tracking-tighter">MediaPipe Gaze Stream Active</p>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center gap-2 text-slate-600">
                <svg className="w-8 h-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <span className="text-xs font-medium">Camera Inactive</span>
              </div>
            )}

            <div className="space-y-3 mt-2">
              <StatRow label="Accuracy" value={state.isCalibrated ? 'High' : 'Low (Recalibrate)'} color={state.isCalibrated ? 'text-emerald-400' : 'text-amber-400'} />
              <StatRow label="Engine" value="FaceMesh v2" />
              <StatRow label="Dwell" value="3000ms" />
              <StatRow label="Target" value={state.targetElement ? 'Detected' : 'Idle'} color={state.targetElement ? 'text-blue-400' : 'text-slate-500'} />
            </div>
            
            {state.mode === TrackingMode.GAZE && (
              <div className="flex gap-2 mt-4">
                <button
                    onClick={() => setShowCalibration(true)}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all text-xs font-bold uppercase tracking-widest border border-white/10"
                >
                    Recalibrate
                </button>
                <button
                    onClick={resetCalibration}
                    className="p-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all border border-slate-600"
                    title="Reset to defaults"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex justify-between items-center mb-2 px-2">
            <h2 className="text-lg font-bold text-slate-300">Interface Targets</h2>
            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-tighter">
              <span className="text-blue-400">Hits: {clickCount}</span>
              <span className="text-slate-500">Last: {lastAction}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { id: 'btn1', label: 'Primary Node', color: 'bg-blue-600 shadow-blue-500/20' },
              { id: 'btn2', label: 'Safety Lock', color: 'bg-emerald-600 shadow-emerald-500/20' },
              { id: 'btn3', label: 'Alert Center', color: 'bg-amber-600 shadow-amber-500/20' },
              { id: 'btn4', label: 'Delete Data', color: 'bg-rose-600 shadow-rose-500/20' },
              { id: 'btn5', label: 'Cloud Sync', color: 'bg-indigo-600 shadow-indigo-500/20' },
              { id: 'btn6', label: 'System Bio', color: 'bg-purple-600 shadow-purple-500/20' },
              { id: 'btn7', label: 'Power Grid', color: 'bg-cyan-600 shadow-cyan-500/20' },
              { id: 'btn8', label: 'Archive', color: 'bg-slate-700 shadow-slate-900/40' },
              { id: 'btn9', label: 'Diagnostics', color: 'bg-orange-600 shadow-orange-500/20' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => handleAction(btn.label)}
                className={`${btn.color} h-32 rounded-2xl text-white font-bold shadow-xl transition-all active:scale-95 flex flex-col items-center justify-center gap-3 p-4 text-center border border-white/10 group relative overflow-hidden`}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-sm tracking-tight">{btn.label}</span>
              </button>
            ))}

            <div 
              data-dwellable="true" 
              onClick={() => handleAction('Surface Area')}
              className="col-span-2 md:col-span-3 h-48 rounded-3xl border-2 border-dashed border-slate-700 bg-slate-900/30 flex flex-col items-center justify-center text-slate-500 hover:border-slate-500 hover:text-slate-300 transition-all cursor-crosshair group"
            >
              <svg className="w-10 h-10 mb-3 opacity-20 group-hover:opacity-100 transition-opacity duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3a10.003 10.003 0 00-6.912 2.72m.947 12.13a9 9 0 1112.728 0M12 12V3m0 9l4 4m-4-4l-4 4" />
              </svg>
              <span className="text-sm font-mono tracking-widest uppercase">Precision Dwell Zone</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

const StatRow: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div className="flex justify-between text-[11px] py-1.5 border-b border-slate-700/50 last:border-0 uppercase tracking-widest">
    <span className="text-slate-500 font-bold">{label}</span>
    <span className={`font-mono font-bold ${color || 'text-slate-300'}`}>{value}</span>
  </div>
);
