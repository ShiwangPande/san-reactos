import React, { useState, useEffect } from 'react';
import { X, Volume2, Monitor, Keyboard, Gamepad2, Laptop, Save, LogOut } from 'lucide-react';
import { audioManager } from '../../utils/audio';
import { GameSettings } from '../../types';

interface SettingsMenuProps {
  onClose: () => void;
  currentSettings: GameSettings;
  onApply: (settings: GameSettings) => void;
}

interface TabButtonProps {
    icon: React.ComponentType<any>;
    label: string;
    active: boolean;
    onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ icon: Icon, label, active, onClick }) => (
    <button 
        onClick={() => { audioManager.playUI('click'); onClick(); }}
        className={`flex items-center gap-4 p-4 w-full transition-all duration-200 border-l-4 ${
            active 
            ? 'bg-gradient-to-r from-yellow-500/20 to-transparent border-yellow-500 text-yellow-500' 
            : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
        }`}
    >
        <Icon size={24} />
        <span className="font-bold tracking-wider uppercase text-lg">{label}</span>
    </button>
);

const SettingsMenu: React.FC<SettingsMenuProps> = ({ onClose, currentSettings, onApply }) => {
    const [activeTab, setActiveTab] = useState<'audio' | 'graphics' | 'controls' | 'gameplay' | 'system'>('audio');
    
    // State initialization
    const [masterVol, setMasterVol] = useState(currentSettings.audio.master * 100);
    const [musicVol, setMusicVol] = useState(currentSettings.audio.music * 100);
    const [sfxVol, setSfxVol] = useState(currentSettings.audio.sfx * 100);
    
    const [resolution, setResolution] = useState(currentSettings.graphics.resolution);
    const [quality, setQuality] = useState(currentSettings.graphics.quality);
    const [bloom, setBloom] = useState(currentSettings.graphics.bloom);
    const [ao, setAo] = useState(currentSettings.graphics.ambientOcclusion);
    
    const [sensitivity, setSensitivity] = useState(currentSettings.gameplay.sensitivity);
    const [invertY, setInvertY] = useState(currentSettings.gameplay.invertY);
    const [showHud, setShowHud] = useState(currentSettings.gameplay.showHud);

    const handleApply = () => {
        audioManager.playUI('mission'); // Success sound
        
        const newSettings: GameSettings = {
            audio: {
                master: masterVol / 100,
                music: musicVol / 100,
                sfx: sfxVol / 100
            },
            graphics: {
                resolution,
                quality,
                vsync: currentSettings.graphics.vsync,
                ambientOcclusion: ao,
                bloom: bloom
            },
            gameplay: {
                sensitivity,
                invertY,
                showHud
            }
        };

        onApply(newSettings);
        setTimeout(onClose, 200); // Short delay to hear sound
    };

    // Real-time Audio Preview
    const handleMasterVolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        setMasterVol(val);
        audioManager.setMasterVolume(val / 100);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md">
            {/* Main Container */}
            <div className="w-full max-w-6xl h-[85vh] flex rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-[#0f172a] relative">
                
                {/* Close Button */}
                <button 
                    onClick={() => { audioManager.playUI('click'); onClose(); }}
                    className="absolute top-6 right-6 z-10 text-white/50 hover:text-white hover:scale-110 transition-transform"
                >
                    <X size={32} />
                </button>

                {/* Sidebar */}
                <div className="w-80 bg-black/40 border-r border-white/5 flex flex-col py-8 backdrop-blur-sm">
                    <div className="px-8 mb-12">
                        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 to-yellow-700 italic tracking-tighter uppercase drop-shadow-sm">
                            Settings
                        </h2>
                        <div className="h-1 w-16 bg-yellow-600 mt-2 rounded-full"></div>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                        <TabButton icon={Volume2} label="Audio" active={activeTab === 'audio'} onClick={() => setActiveTab('audio')} />
                        <TabButton icon={Monitor} label="Graphics" active={activeTab === 'graphics'} onClick={() => setActiveTab('graphics')} />
                        <TabButton icon={Keyboard} label="Controls" active={activeTab === 'controls'} onClick={() => setActiveTab('controls')} />
                        <TabButton icon={Gamepad2} label="Gameplay" active={activeTab === 'gameplay'} onClick={() => setActiveTab('gameplay')} />
                        <TabButton icon={Laptop} label="System" active={activeTab === 'system'} onClick={() => setActiveTab('system')} />
                    </div>

                    <div className="mt-auto px-8 text-xs text-gray-600 font-mono">
                        VERSION 1.0.4<br/>BUILD 8920
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 relative bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-fixed">
                    {/* Content Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/95 to-slate-950/95"></div>

                    {/* Scrollable Content */}
                    <div className="relative z-10 h-full overflow-y-auto p-12">
                        <h3 className="text-3xl text-white font-bold mb-8 border-b border-white/10 pb-4 flex items-center gap-3">
                            {activeTab === 'audio' && <Volume2 className="text-yellow-500" />}
                            {activeTab === 'graphics' && <Monitor className="text-yellow-500" />}
                            {activeTab === 'controls' && <Keyboard className="text-yellow-500" />}
                            {activeTab === 'gameplay' && <Gamepad2 className="text-yellow-500" />}
                            {activeTab === 'system' && <Laptop className="text-yellow-500" />}
                            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                        </h3>

                        {activeTab === 'audio' && (
                            <div className="space-y-10 max-w-2xl">
                                <RangeControl label="Master Volume" value={masterVol} onChange={handleMasterVolChange} />
                                <RangeControl label="Music Volume" value={musicVol} onChange={(e) => setMusicVol(parseInt(e.target.value))} />
                                <RangeControl label="SFX Volume" value={sfxVol} onChange={(e) => setSfxVol(parseInt(e.target.value))} />
                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-200 text-sm">
                                    Audio settings are applied in real-time or upon Apply.
                                </div>
                            </div>
                        )}

                        {activeTab === 'graphics' && (
                            <div className="space-y-8 max-w-2xl">
                                <SelectControl 
                                    label="Resolution" 
                                    value={resolution} 
                                    options={['3840x2160', '2560x1440', '1920x1080', '1280x720']} 
                                    onChange={(e) => setResolution(e.target.value)} 
                                />
                                <SelectControl 
                                    label="Graphics Quality" 
                                    value={quality} 
                                    options={['Ultra', 'High', 'Medium', 'Low']} 
                                    onChange={(e) => setQuality(e.target.value)} 
                                />
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded border border-white/10">
                                    <span className="text-white font-medium">Ambient Occlusion</span>
                                    <Toggle checked={ao} onChange={() => setAo(!ao)} />
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded border border-white/10">
                                    <span className="text-white font-medium">Bloom</span>
                                    <Toggle checked={bloom} onChange={() => setBloom(!bloom)} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'controls' && (
                            <div className="space-y-4 max-w-2xl">
                                <KeyBind action="Move Forward" k="W" />
                                <KeyBind action="Move Backward" k="S" />
                                <KeyBind action="Move Left" k="A" />
                                <KeyBind action="Move Right" k="D" />
                                <KeyBind action="Jump" k="SPACE" />
                                <KeyBind action="Enter/Exit Vehicle" k="F" />
                                <KeyBind action="Interact / Talk" k="T" />
                                <KeyBind action="Change Camera" k="V" />
                                <KeyBind action="Horn" k="H" />
                                <KeyBind action="Shoot / Attack" k="LMB" />
                            </div>
                        )}

                        {activeTab === 'gameplay' && (
                            <div className="space-y-8 max-w-2xl">
                                <RangeControl label="Mouse Sensitivity" value={sensitivity} onChange={(e) => setSensitivity(parseInt(e.target.value))} />
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded border border-white/10">
                                    <span className="text-white font-medium">Invert Y-Axis</span>
                                    <Toggle checked={invertY} onChange={() => setInvertY(!invertY)} />
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded border border-white/10">
                                    <span className="text-white font-medium">Show HUD</span>
                                    <Toggle checked={showHud} onChange={() => setShowHud(!showHud)} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'system' && (
                            <div className="grid grid-cols-2 gap-6 max-w-2xl">
                                <button className="p-8 bg-green-900/30 border border-green-500/30 hover:bg-green-900/50 hover:border-green-500 transition-all rounded-lg flex flex-col items-center gap-4 group">
                                    <Save size={40} className="text-green-500 group-hover:scale-110 transition-transform" />
                                    <span className="text-white font-bold text-lg">Save Game</span>
                                </button>
                                <button 
                                    onClick={() => window.location.reload()}
                                    className="p-8 bg-red-900/30 border border-red-500/30 hover:bg-red-900/50 hover:border-red-500 transition-all rounded-lg flex flex-col items-center gap-4 group"
                                >
                                    <LogOut size={40} className="text-red-500 group-hover:scale-110 transition-transform" />
                                    <span className="text-white font-bold text-lg">Exit to Desktop</span>
                                </button>
                            </div>
                        )}

                    </div>

                    {/* Bottom Action Bar */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-black/40 border-t border-white/10 backdrop-blur-md flex justify-end gap-4">
                         <button 
                             onClick={() => { audioManager.playUI('click'); onClose(); }}
                             className="px-8 py-3 rounded text-white font-bold uppercase tracking-widest hover:bg-white/10 transition-colors"
                         >
                             Cancel
                         </button>
                         <button 
                             onClick={handleApply}
                             className="px-8 py-3 rounded bg-yellow-600 hover:bg-yellow-500 text-black font-black uppercase tracking-widest shadow-lg shadow-yellow-900/20 transition-all transform hover:scale-105 active:scale-95"
                         >
                             Apply Changes
                         </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Reusable UI Subcomponents ---

const RangeControl = ({ label, value, onChange }: { label: string, value: number, onChange: (e: any) => void }) => (
    <div className="flex flex-col gap-3">
        <div className="flex justify-between text-white font-medium">
            <span>{label}</span>
            <span className="text-yellow-500 font-mono">{value}%</span>
        </div>
        <input 
            type="range" 
            min="0" max="100" 
            value={value} 
            onChange={onChange}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500 hover:accent-yellow-400"
        />
    </div>
);

const SelectControl = ({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (e: any) => void }) => (
    <div className="flex flex-col gap-3">
        <label className="text-white font-medium">{label}</label>
        <select 
            value={value} 
            onChange={onChange}
            className="w-full p-4 bg-black/50 border border-white/20 rounded text-white focus:border-yellow-500 focus:outline-none transition-colors appearance-none"
        >
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

const Toggle = ({ checked, defaultChecked, onChange }: { checked?: boolean, defaultChecked?: boolean, onChange?: () => void }) => (
    <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" checked={checked} defaultChecked={defaultChecked} onChange={onChange} />
        <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-yellow-600"></div>
    </label>
);

const KeyBind = ({ action, k }: { action: string, k: string }) => (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded border border-white/5 hover:border-white/10 transition-colors">
        <span className="text-gray-300 font-medium tracking-wide">{action}</span>
        <div className="px-4 py-2 bg-black/50 border border-white/20 rounded min-w-[3rem] text-center font-mono font-bold text-yellow-500 shadow-inner">
            {k}
        </div>
    </div>
);

export default SettingsMenu;