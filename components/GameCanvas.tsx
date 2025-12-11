import React, { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { KeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { EntityType, GameState, WeaponType, GameSettings } from '../types';
import { generateWorld, SPAWN_COORDS } from '../utils/worldGen';
import { generateNpcDialogue } from '../services/geminiService';
import { TILE_SIZE } from '../constants';
import GameScene from './GameScene';
import Loader from './ui/Loader';

// --- CONTROLS CONFIG ---
const KEYBOARD_MAP = [
    { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
    { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
    { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
    { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
    { name: 'jump', keys: ['Space'] },
    { name: 'view', keys: ['v', 'V'] }
];

interface GameCanvasProps {
  onUpdateState: (state: Partial<GameState>) => void;
  onMissionTrigger: () => void;
  isMenuOpen: boolean;
  settings: GameSettings;
}

const GameCanvas = ({ onUpdateState, onMissionTrigger, isMenuOpen, settings }: GameCanvasProps) => {
  const stateRef = useRef<GameState>({
    player: {
      id: 'player',
      type: EntityType.PLAYER,
      // Initialize player at the safe spawn road intersection
      pos: { x: SPAWN_COORDS.x * TILE_SIZE, y: 0.5, z: SPAWN_COORDS.z * TILE_SIZE },
      vel: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      health: 100,
      maxHealth: 100,
      color: '#fff',
      size: { x: 0.8, y: 1.8, z: 0.8 },
      state: 'idle',
      inventory: [WeaponType.FIST],
      faction: 'groves'
    },
    entities: [],
    map: { width: 0, height: 0, tileSize: 0, tiles: [], elevations: [] },
    timeOfDay: 720,
    money: 350,
    wantedLevel: 0,
    dialogue: null,
    mission: null,
    paused: false
  });
  
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    // Initial World Generation
    const { map, entities } = generateWorld();
    stateRef.current.map = map;
    stateRef.current.entities = entities;
    onUpdateState({ player: stateRef.current.player });
    
    // Simulate short delay for UI stability
    setTimeout(() => setSceneReady(true), 100);

    // Global Key Handlers (Interactions outside of movement)
    const handleKeyDown = async (e: KeyboardEvent) => {
        const state = stateRef.current;
        const player = state.player;

        if (player.state === 'entering_vehicle' || player.state === 'exiting_vehicle') return;

        // F: Enter/Exit Vehicle
        if (e.key === 'f' || e.key === 'F') {
            if (player.vehicleId) {
                 const car = state.entities.find(ent => ent.id === player.vehicleId);
                 if (car) {
                     player.state = 'exiting_vehicle';
                     player.vehicleId = null;
                     car.vehicleId = null;
                     
                     const doorOffset = new THREE.Vector3(-1.2, 0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), car.rotation.y);
                     player.pos = { x: car.pos.x + doorOffset.x, y: car.pos.y, z: car.pos.z + doorOffset.z };
                     
                     const awayOffset = new THREE.Vector3(-3.0, 0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), car.rotation.y);
                     player.targetPos = { x: car.pos.x + awayOffset.x, y: car.pos.y, z: car.pos.z + awayOffset.z };
                 }
            } else {
                 const car = state.entities.find(ent => ent.type === EntityType.VEHICLE && Math.sqrt((player.pos.x - ent.pos.x)**2 + (player.pos.z - ent.pos.z)**2) < 5);
                 if (car) { 
                     player.state = 'entering_vehicle';
                     player.targetEntityId = car.id;
                 }
            }
        }
        // T: Talk to NPC
        if (e.key === 't' || e.key === 'T') {
            const nearby = state.entities.find(ent => (ent.type === EntityType.CIVILIAN || ent.type === EntityType.GANG_MEMBER) && Math.sqrt((player.pos.x - ent.pos.x)**2 + (player.pos.z - ent.pos.z)**2) < 5);
            if (nearby) {
                 onUpdateState({ dialogue: { speaker: nearby.faction || 'Stranger', text: '...' } });
                 const text = await generateNpcDialogue(nearby.faction || 'civilian', 'Approached on street', 'Player waved');
                 state.dialogue = { speaker: nearby.faction || 'Stranger', text };
                 onUpdateState({ dialogue: state.dialogue });
                 setTimeout(() => onUpdateState({ dialogue: null }), 4000);
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Map Quality to DPR (Device Pixel Ratio)
  const getDpr = () => {
      switch(settings.graphics.quality) {
          case 'Low': return 0.6;
          case 'Medium': return 0.8;
          case 'High': return 1.0;
          case 'Ultra': return 1.5;
          default: return 1.0;
      }
  };

  return (
    <Canvas 
        shadows 
        dpr={getDpr()}
        camera={{ position: [0, 10, 15], fov: 60 }} 
        style={{ background: '#0f172a' }} 
        gl={{ 
            antialias: false, 
            toneMapping: THREE.ACESFilmicToneMapping, 
            toneMappingExposure: 1.0,
            powerPreference: "high-performance"
        }}
    >
        <KeyboardControls map={KEYBOARD_MAP}>
            <Suspense fallback={<Loader />}>
                {sceneReady && (
                    <GameScene 
                        stateRef={stateRef} 
                        onUpdateState={onUpdateState} 
                        isMenuOpen={isMenuOpen} 
                        settings={settings}
                    />
                )}
                {!sceneReady && <Loader />}
            </Suspense>
        </KeyboardControls>
    </Canvas>
  );
};

export default GameCanvas;