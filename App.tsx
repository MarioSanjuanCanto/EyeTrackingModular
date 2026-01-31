
import React from 'react';
import { EyeTrackerProvider } from './components/EyeTracker/EyeTrackerProvider';
import { EyeCursor } from './components/EyeTracker/EyeCursor';
import { TestDashboard } from './components/TestDashboard';

const App: React.FC = () => {
  return (
    <EyeTrackerProvider>
      <div className="relative min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
        {/* Background Mesh Gradients */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/30 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/30 blur-[120px] rounded-full"></div>
        </div>

        {/* Global Eye Tracking Cursor */}
        <EyeCursor />

        {/* Application Content */}
        <div className="relative z-10">
          <TestDashboard />
        </div>

        {/* Footer / Info */}
        <footer className="relative z-10 py-8 text-center text-slate-500 text-xs border-t border-slate-900/50">
          <p>© 2024 Ocular System — Production-Grade Modular Eye Tracker</p>
          <div className="mt-2 flex justify-center gap-4">
            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> System Ready</span>
            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> WebGazer Integration</span>
          </div>
        </footer>
      </div>
    </EyeTrackerProvider>
  );
};

export default App;
