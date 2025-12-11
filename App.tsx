import React, { useState, useCallback, ErrorInfo, ReactNode, useEffect, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import HUD from './components/ui/HUD';
import IntroScreen from './components/ui/IntroScreen';
import SettingsMenu from './components/ui/SettingsMenu';
import CustomCursor from './components/ui/CustomCursor';
import { GameState, GameSettings } from './types';
import { generateMission } from './services/geminiService';
import { audioManager } from './utils/audio';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Error Boundary to catch React render errors
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-red-900 text-white flex-col p-8">
          <h1 className="text-4xl font-bold mb-4">Wasted</h1>
          <p className="text-xl">Something went wrong starting the game engine.</p>
          <pre className="mt-4 p-4 bg-black rounded text-red-300 overflow-auto max-w-full">
            {this.state.error?.toString()}
          </pre>
          <button 
            className="mt-8 bg-white text-black px-4 py-2 rounded"
            onClick={() => window.location.reload()}
          >
            Respawn (Reload)
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const DEFAULT_SETTINGS: GameSettings = {
    audio: { master: 0.3, music: 0.8, sfx: 0.75 },
    graphics: {
        resolution: '1920x1080',
        quality: 'High',
        vsync: true,
        ambientOcclusion: true,
        bloom: true
    },
    gameplay: {
        sensitivity: 50,
        invertY: false,
        showHud: true
    }
};

const WastedScreen: React.FC = () => (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 animate-in fade-in duration-500">
        <h1 
            className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-gray-300 to-gray-600 tracking-tighter drop-shadow-lg scale-110 animate-pulse"
            style={{ fontFamily: 'Impact, sans-serif', textShadow: '0 0 20px rgba(255,0,0,0.5)' }}
        >
            WASTED
        </h1>
    </div>
);

const App: React.FC = () => {
  const [hudState, setHudState] = useState<Partial<GameState>>({
    money: 0,
    timeOfDay: 720,
    wantedLevel: 0,
    dialogue: null,
    mission: null,
    player: { health: 100 } as any
  });
 
  const [intro, setIntro] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  
  // Use ref to access current intro state inside event listener without re-binding
  const introRef = useRef(intro);
  useEffect(() => { introRef.current = intro; }, [intro]);

  // Handle class for hiding system cursor globally when custom one is active
  useEffect(() => {
    if (intro || showSettings) {
        document.body.classList.add('custom-cursor-active');
    } else {
        document.body.classList.remove('custom-cursor-active');
    }
  }, [intro, showSettings]);

  // Apply settings to Audio System immediately when they change
  useEffect(() => {
      audioManager.setMasterVolume(settings.audio.master);
      audioManager.setMusicVolume(settings.audio.music);
      audioManager.setSfxVolume(settings.audio.sfx);
  }, [settings.audio]);

  const handleApplySettings = (newSettings: GameSettings) => {
      setSettings(newSettings);
      setShowSettings(false);
  };

  const handleUpdateState = useCallback((newState: Partial<GameState>) => {
    setHudState(prev => ({ ...prev, ...newState }));
  }, []);

  const handleMissionTrigger = async () => {
    try {
      const missionData: any = await generateMission();

      const title = String(missionData?.title ?? missionData?.name ?? 'Untitled Mission');
      const description = String(missionData?.description ?? missionData?.summary ?? '');

      setHudState(prev => ({
          ...prev,
          dialogue: { 
              speaker: 'Anonymous Contact', 
              text: `Check your phone. Mission: ${title}. ${description}` 
          },
          mission: title
      }));

      setTimeout(() => {
          setHudState(prev => ({ ...prev, dialogue: null }));
      }, 6000);
    } catch (err) {
      console.error('Failed to generate mission', err);
      setHudState(prev => ({
        ...prev,
        dialogue: { speaker: 'System', text: 'Failed to retrieve mission. Try again later.' }
      }));
      setTimeout(() => setHudState(prev => ({ ...prev, dialogue: null })), 4000);
    }
  };

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
              if (!introRef.current) {
                  setShowSettings(prev => {
                      const willShow = !prev;
                      if (willShow) {
                          audioManager.playUI('click');
                          // Explicitly exit pointer lock when opening menu
                          if (document.pointerLockElement) {
                              document.exitPointerLock();
                          }
                      }
                      return willShow;
                  });
              }
          }
      };
      
      // Use capture to ensure we get the event before other listeners might stop it
      window.addEventListener('keydown', handleKeyDown, true);
      return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const isWasted = hudState.player?.state === 'dead';

  return (
    <ErrorBoundary>
      <div className="relative w-full h-screen bg-black overflow-hidden select-none font-sans">
        {(intro || showSettings) && <CustomCursor />}

        {isWasted && <WastedScreen />}

        <GameCanvas 
          onUpdateState={handleUpdateState} 
          onMissionTrigger={handleMissionTrigger}
          isMenuOpen={showSettings || intro}
          settings={settings}
        />
        
        {!intro && !showSettings && !isWasted && settings.gameplay.showHud && (
             <HUD state={hudState} onMissionClick={handleMissionTrigger} />
        )}

        {intro && <IntroScreen onStart={() => setIntro(false)} />}
        
        {showSettings && (
            <SettingsMenu 
                onClose={() => setShowSettings(false)} 
                currentSettings={settings}
                onApply={handleApplySettings}
            />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;