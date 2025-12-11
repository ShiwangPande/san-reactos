import React from 'react';
import { GameState, WeaponType } from '../../types';
import { Clock, Shield, DollarSign, MessageCircle, Map as MapIcon, Crosshair } from 'lucide-react';
import { audioManager } from '../../utils/audio';

interface HUDProps {
  state: Partial<GameState>;
  onMissionClick: () => void;
}

const HUD: React.FC<HUDProps> = ({ state, onMissionClick }) => {
  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const handleMissionClick = () => {
    audioManager.playUI('click');
    onMissionClick();
  };

  // Wanted Stars
  const stars = Array(5).fill(0).map((_, i) => (
    <span key={i} className={`text-2xl ${i < (state.wantedLevel || 0) ? 'text-yellow-500' : 'text-gray-800'}`}>★</span>
  ));

  return (
    <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
      {/* Top Right: Stats */}
      <div className="flex flex-col items-end gap-2">
        <div className="bg-black/80 text-green-400 p-2 rounded-lg font-mono text-xl border-2 border-green-800 flex items-center gap-2">
           <DollarSign size={20} />
           {state.money?.toLocaleString()}
        </div>
        <div className="bg-black/80 text-white p-2 rounded-lg font-mono text-xl border-2 border-gray-700 flex items-center gap-2">
           <Clock size={20} />
           {formatTime(state.timeOfDay || 0)}
        </div>
        <div className="flex gap-1 bg-black/50 p-1 rounded-full">
            {stars}
        </div>
        <div className="bg-black/80 text-white p-2 rounded-lg max-w-sm text-right">
             <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Current Zone</div>
             <div className="font-bold text-xl text-yellow-500">LOS REACTOS</div>
        </div>
      </div>

      {/* Center: Dialogue / Mission */}
      <div className="flex flex-col items-center justify-center pointer-events-auto">
        {state.dialogue && (
            <div className="bg-black/90 border-l-4 border-yellow-500 text-white p-6 max-w-2xl rounded shadow-2xl animate-fade-in-up">
                <div className="uppercase text-yellow-500 font-bold mb-1 text-sm tracking-wider">{state.dialogue.speaker}</div>
                <div className="text-2xl font-serif leading-relaxed">"{state.dialogue.text}"</div>
            </div>
        )}

        {state.mission && (
             <div className="mt-4 bg-yellow-500 text-black p-4 rounded-lg font-bold shadow-lg animate-pulse">
                NEW MISSION: {state.mission}
             </div>
        )}
      </div>

      {/* Bottom Left: Mini-map / Health */}
      <div className="flex items-end gap-4">
        {/* Radar / Minimap Placeholder */}
        <div className="w-32 h-32 bg-gray-900 rounded-full border-4 border-gray-600 relative overflow-hidden opacity-90 hidden sm:block">
            <div className="absolute inset-0 flex items-center justify-center text-gray-600">
                <MapIcon size={32} />
            </div>
            {/* Player Blip */}
            <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg z-10"></div>
        </div>

        <div className="flex flex-col gap-2">
             {/* Weapon */}
             <div className="bg-black/70 text-white p-2 rounded flex items-center gap-2">
                 <Crosshair size={18} />
                 <span className="font-bold">{state.player?.inventory?.[0] || 'Fist'}</span>
                 {/* Combo Counter for Melee */}
                 {(state.player?.inventory?.[0] === 'Fist' || !state.player?.inventory?.[0]) && (state as any).meleeCombo > 0 && (
                     <span className="ml-auto text-yellow-400 font-bold text-sm">
                         COMBO x{(state as any).meleeCombo}
                     </span>
                 )}
             </div>

             {/* Health Bar */}
             <div className="w-48 h-6 bg-gray-800 rounded-full overflow-hidden border-2 border-gray-600 relative">
                 <div 
                    className="h-full bg-red-600 transition-all duration-300" 
                    style={{ width: `${state.player?.health || 100}%` }}
                 ></div>
                 <Shield size={14} className="absolute top-1 left-2 text-white/50" />
             </div>
             {/* Armor Bar (Fake for visual) */}
             <div className="w-48 h-4 bg-gray-800 rounded-full overflow-hidden border-2 border-gray-600 relative -mt-1">
                 <div className="h-full bg-blue-500 w-1/2"></div>
             </div>
        </div>
      </div>

      {/* Floating Instructions */}
      <div className="absolute bottom-4 right-4 text-white/50 text-xs text-right font-mono pointer-events-none">
         <p>CLICK to Lock Mouse / Attack</p>
         <p>MOUSE to Look</p>
         <p>WASD to Move</p>
         <p>V to Change View</p>
         <p>F to Enter/Exit Vehicle</p>
         <p>T to Talk</p>
         <p className="text-yellow-400 mt-1">FIST: Click to Punch (Combo System!)</p>
      </div>

       {/* Phone Button */}
       <button 
         onClick={handleMissionClick}
         onMouseEnter={() => audioManager.playUI('hover')}
         className="absolute bottom-20 right-4 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-xl pointer-events-auto transition-transform transform hover:scale-110"
       >
         <MessageCircle size={24} />
       </button>
    </div>
  );
};

export default HUD;