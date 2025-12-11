import React from 'react';
import { Html, useProgress } from '@react-three/drei';

const Loader: React.FC = () => {
  const { progress } = useProgress();
  return (
    <Html center zIndexRange={[100, 0]}>
      <div className="flex flex-col items-center justify-center bg-black/80 p-8 rounded-lg border border-gray-700 shadow-2xl backdrop-blur-md">
        <h2 className="text-2xl font-bold text-white mb-4 tracking-widest">LOADING WORLD</h2>
        <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-yellow-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-gray-400 font-mono">{progress.toFixed(0)}%</div>
      </div>
    </Html>
  );
};

export default Loader;