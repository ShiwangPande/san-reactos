import React, { useEffect } from 'react';
import { audioManager } from '../../utils/audio';

interface IntroScreenProps {
    onStart: () => void;
}

const IntroScreen: React.FC<IntroScreenProps> = ({ onStart }) => {
    
    useEffect(() => {
        // Attempt to resume context on mount if possible, though browsers block it until interaction
        const startMusic = () => {
             audioManager.resume();
             audioManager.setMusic('intro');
             window.removeEventListener('click', startMusic);
             window.removeEventListener('keydown', startMusic);
        };
        window.addEventListener('click', startMusic);
        window.addEventListener('keydown', startMusic);
        
        return () => {
             window.removeEventListener('click', startMusic);
             window.removeEventListener('keydown', startMusic);
        };
    }, []);

    const handleStart = () => {
        audioManager.playUI('click');
        // Resume context in case the user hasn't clicked anything yet (e.g. tabbed to button)
        audioManager.resume();
        audioManager.setMusic('none'); // Transition happens in GameScene
        onStart();
    };

    console.log('IntroScreen rendering');
    
    return (
        <div 
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden" 
            style={{ 
                backgroundColor: '#0f172a',
                width: '100vw',
                height: '100vh',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
            }}
        >
            {/* Cinematic Background Layer */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-[#0f172a] to-black" style={{ opacity: 0.95 }}></div>
            
            {/* Animated Particles/Stars */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(40)].map((_, i) => (
                    <div 
                        key={i}
                        className="absolute bg-white rounded-full opacity-0 animate-pulse"
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            width: `${Math.random() * 2 + 1}px`,
                            height: `${Math.random() * 2 + 1}px`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${3 + Math.random() * 4}s`,
                            opacity: Math.random() * 0.5
                        }}
                    />
                ))}
            </div>

            {/* Blurred City Silhouette (Abstract) */}
            <div className="absolute bottom-0 left-0 right-0 h-2/3 flex items-end justify-center pointer-events-none blur-sm opacity-50">
                    {[...Array(25)].map((_, i) => {
                    const height = 15 + Math.random() * 40;
                    return (
                        <div 
                            key={i} 
                            className="bg-black mx-[2px] transform translate-y-4"
                            style={{
                                width: `${2 + Math.random() * 6}%`,
                                height: `${height}%`,
                                opacity: 0.6 + Math.random() * 0.4,
                            }} 
                        />
                    );
                    })}
            </div>

            {/* Atmospheric Glow at Horizon */}
            <div className="absolute bottom-0 w-full h-96 bg-gradient-to-t from-blue-900/20 via-yellow-900/10 to-transparent pointer-events-none"></div>

            {/* Main Content Container */}
            <div className="relative z-10 flex flex-col items-center text-center p-8 max-w-5xl w-full">
                
                {/* Logo / Title Group */}
                <div className="mb-14 relative group cursor-default">
                    <h1 
                        className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-400 to-yellow-700 tracking-tighter drop-shadow-2xl transform transition-transform duration-1000 group-hover:scale-105"
                        style={{ fontFamily: 'Impact, sans-serif', textShadow: '0 20px 50px rgba(0,0,0,0.8)' }}
                    >
                        SAN REACTOS
                    </h1>
                    {/* Subtitle */}
                    <div className="flex items-center justify-center gap-4 mt-2">
                        <div className="h-[1px] w-12 bg-yellow-500/50"></div>
                        <h2 className="text-2xl md:text-3xl text-yellow-100 font-light tracking-[0.8em] uppercase drop-shadow-md font-mono">
                            Stories
                        </h2>
                        <div className="h-[1px] w-12 bg-yellow-500/50"></div>
                    </div>
                    
                    {/* Glow Effect behind logo */}
                    <div className="absolute -inset-10 bg-yellow-500/10 blur-3xl rounded-full opacity-50 pointer-events-none"></div>
                </div>

                {/* Info Box */}
                <div className="bg-gradient-to-r from-transparent via-black/60 to-transparent backdrop-blur-sm p-8 rounded-sm border-y border-white/10 max-w-2xl mb-14 shadow-2xl">
                    <p className="text-gray-300 text-lg md:text-xl leading-relaxed font-light">
                        Enter a living, breathing low-poly metropolis. <br/>
                        <span className="text-yellow-400 font-medium">Rule the streets.</span> Build your empire. Survive the chaos.
                    </p>
                    
                    <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs font-mono text-gray-500 uppercase tracking-widest border-t border-white/5 pt-6">
                        <span className="flex items-center gap-2"><span className="w-1 h-1 bg-yellow-500 rounded-full"></span>WASD Move</span>
                        <span className="flex items-center gap-2"><span className="w-1 h-1 bg-yellow-500 rounded-full"></span>F Enter Car</span>
                        <span className="flex items-center gap-2"><span className="w-1 h-1 bg-yellow-500 rounded-full"></span>T Talk</span>
                        <span className="flex items-center gap-2"><span className="w-1 h-1 bg-red-500 rounded-full"></span>Click Attack</span>
                    </div>
                </div>

                {/* Start Button */}
                <button 
                    onMouseEnter={() => audioManager.playUI('hover')}
                    onClick={handleStart}
                    className="group relative px-16 py-5 bg-transparent overflow-hidden transition-all hover:scale-105 active:scale-95"
                >
                    {/* Button Background & Hover Slide */}
                    <div className="absolute inset-0 bg-yellow-600/10 transform skew-x-12 group-hover:bg-yellow-600 transition-colors duration-300"></div>
                    <div className="absolute inset-0 border border-yellow-600/50 group-hover:border-yellow-400 transition-colors duration-300"></div>
                    
                    {/* Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>

                    <span className="relative text-2xl font-black text-yellow-500 group-hover:text-black uppercase tracking-[0.2em] transition-colors duration-300">
                        Start Game
                    </span>
                </button>

                <div className="mt-20 text-[10px] text-white/20 font-mono tracking-widest uppercase">
                    Procedural City Engine • Built with React Three Fiber
                </div>
            </div>
        </div>
    );
};

export default IntroScreen;