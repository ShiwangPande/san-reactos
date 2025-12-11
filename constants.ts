import { TileType } from './types';

export const CANVAS_WIDTH = window.innerWidth;
export const CANVAS_HEIGHT = window.innerHeight;

// 3D Scale: 1 unit = 1 meter approx
export const TILE_SIZE = 10; 
export const MAP_WIDTH = 100;
export const MAP_HEIGHT = 100;

export const WORLD_COLORS = {
  [TileType.GRASS]: '#10b981', // emerald-500
  [TileType.ROAD]: '#1e293b', // slate-800
  [TileType.WATER]: '#2563eb', // blue-600
  [TileType.SIDEWALK]: '#64748b', // slate-500
  [TileType.SAND]: '#fcd34d', // amber-300
  [TileType.MOUNTAIN]: '#475569', // slate-600
  [TileType.FLOOR]: '#78716c', // stone-500
};

export const TIME_SPEED = 0.5; // Minutes per frame
export const PLAYER_SPEED = 0.15;
export const CAR_SPEED = 0.4;
export const ROTATION_SPEED = 0.05;

// Physics Tuning
export const PLAYER_ACCEL = 80.0; // Very snappy acceleration
export const PLAYER_FRICTION = 40.0; // High friction = instant stopping (no sliding)
export const PLAYER_MAX_SPEED = 8.0; // Good running speed

// Vehicle Physics
export const VEHICLE_ACCEL = 20.0;
export const VEHICLE_BRAKE = 15.0;
export const VEHICLE_MAX_SPEED = 35.0;
export const VEHICLE_FRICTION = 2.0; // Rolling resistance
export const VEHICLE_DRAG = 0.5; // Air resistance
export const VEHICLE_STEER_SPEED = 2.5;

export const FACTION_COLORS = {
  civilian: '#fca5a5',
  groves: '#22c55e',
  ballas: '#a855f7',
  police: '#60a5fa'
};