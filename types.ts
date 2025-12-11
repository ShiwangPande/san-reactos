import React from 'react';

export enum EntityType {
  PLAYER = 'PLAYER',
  CIVILIAN = 'CIVILIAN',
  GANG_MEMBER = 'GANG_MEMBER',
  POLICE = 'POLICE',
  VEHICLE = 'VEHICLE',
  BUILDING = 'BUILDING',
  ITEM_WEAPON = 'ITEM_WEAPON',
  PROJECTILE = 'PROJECTILE',
  PROP = 'PROP'
}

export enum TileType {
  GRASS = 0,
  ROAD = 1,
  WATER = 2,
  SIDEWALK = 3,
  SAND = 4,
  MOUNTAIN = 5,
  FLOOR = 6
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Entity {
  id: string;
  type: EntityType;
  pos: Vector3;
  vel: Vector3;
  rotation: Vector3; // Euler angles
  health: number;
  maxHealth: number;
  color: string;
  size: Vector3; // Width, Height, Depth
  state: 'idle' | 'walking' | 'driving' | 'dead' | 'entering_vehicle' | 'exiting_vehicle';
  vehicleId?: string | null; // ID of vehicle currently driving
  targetEntityId?: string; // ID of entity interacting with
  inventory?: string[];
  targetPos?: Vector3; // AI Pathfinding
  faction?: 'civilian' | 'groves' | 'ballas' | 'police';
  propType?: 'tree' | 'streetlight' | 'hydrant' | 'sign'; // Specific for PROPs
  // Visual variations
  buildingType?: 'skyscraper' | 'residential' | 'commercial' | 'industrial';
  accessory?: 'hat' | 'backpack' | 'bandana' | 'none';
}

export interface GameMap {
  width: number;
  height: number;
  tileSize: number;
  tiles: TileType[][];
  elevations: number[][]; // Height map for 3D
}

export interface GameState {
  player: Entity;
  entities: Entity[];
  map: GameMap;
  timeOfDay: number; // 0 - 1440 minutes
  money: number;
  wantedLevel: number;
  dialogue: { speaker: string; text: string } | null;
  mission: string | null;
  paused: boolean;
}

export enum WeaponType {
  FIST = 'Fist',
  PISTOL = 'Pistol',
  UZI = 'Uzi'
}

export interface GameSettings {
  audio: {
    master: number; // 0-1
    music: number;  // 0-1
    sfx: number;    // 0-1
  };
  graphics: {
    resolution: string; 
    quality: 'Low' | 'Medium' | 'High' | 'Ultra';
    vsync: boolean;
    ambientOcclusion: boolean;
    bloom: boolean;
  };
  gameplay: {
    sensitivity: number; // 1-100
    invertY: boolean;
    showHud: boolean;
  };
}

// Augment React's JSX namespace (for React 18+)
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

// Augment Global JSX namespace (fallback)
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}