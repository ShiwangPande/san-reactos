import { GameMap, TileType, Entity, EntityType, Vector3, WeaponType } from '../types';
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, FACTION_COLORS } from '../constants';

// A confirmed road intersection on the island
export const SPAWN_COORDS = { x: 50, z: 50 };

export const generateWorld = (): { map: GameMap; entities: Entity[] } => {
  // 1. Initialize entire map as Ocean
  const tiles: TileType[][] = Array(MAP_HEIGHT).fill(0).map(() => Array(MAP_WIDTH).fill(TileType.WATER));
  const elevations: number[][] = Array(MAP_HEIGHT).fill(0).map(() => Array(MAP_WIDTH).fill(-2));
  const entities: Entity[] = [];

  // Island Configuration
  const MARGIN = 12; // Ocean border size
  const ISLAND_W = MAP_WIDTH - MARGIN * 2;
  const ISLAND_H = MAP_HEIGHT - MARGIN * 2;

  // 2. Build Landmass (Grass & Sand)
  for (let z = MARGIN; z < MAP_HEIGHT - MARGIN; z++) {
      for (let x = MARGIN; x < MAP_WIDTH - MARGIN; x++) {
          // Default to Grass
          tiles[z][x] = TileType.GRASS;
          elevations[z][x] = Math.random() * 0.3;

          // Create irregular coastline / beaches
          const distToEdgeX = Math.min(x - MARGIN, (MAP_WIDTH - MARGIN) - x);
          const distToEdgeZ = Math.min(z - MARGIN, (MAP_HEIGHT - MARGIN) - z);
          const distToEdge = Math.min(distToEdgeX, distToEdgeZ);

          // Noise for shoreline irregularity
          const noise = Math.random() * 2;
          
          if (distToEdge < 3 + noise) {
              tiles[z][x] = TileType.SAND;
              elevations[z][x] = 0.2;
          }
      }
  }

  // 3. Mountains (Procedural Noise-ish) - Only on land
  for (let y = MARGIN + 5; y < MARGIN + 25; y++) {
    for (let x = MAP_WIDTH - MARGIN - 25; x < MAP_WIDTH - MARGIN; x++) {
      if (tiles[y][x] !== TileType.WATER && Math.random() > 0.4) {
        tiles[y][x] = TileType.MOUNTAIN;
        elevations[y][x] = Math.random() * 20 + 5;
      }
    }
  }

  // 4. Roads & City Grid
  // Align grid so it passes through SPAWN_COORDS (50, 50)
  const roadInterval = 16;
  
  for (let z = MARGIN; z < MAP_HEIGHT - MARGIN; z++) {
    for (let x = MARGIN; x < MAP_WIDTH - MARGIN; x++) {
        
        // Skip mountains and water
        if (tiles[z][x] === TileType.MOUNTAIN || tiles[z][x] === TileType.WATER) continue;

        const isRoadX = Math.abs(x - SPAWN_COORDS.x) % roadInterval === 0;
        const isRoadZ = Math.abs(z - SPAWN_COORDS.z) % roadInterval === 0;

        if (isRoadX || isRoadZ) {
            // Don't build road on the very edge of the beach
            if (tiles[z][x] !== TileType.SAND) {
                tiles[z][x] = TileType.ROAD;
                elevations[z][x] = 0.1;
            }
        }
    }
  }

  // Helper
  const addEntity = (type: EntityType, x: number, z: number, props: Partial<Entity> = {}) => {
    // Basic ground clamp
    const y = props.pos?.y ?? (type === EntityType.PROP ? 0 : 1.5);
    
    entities.push({
      id: Math.random().toString(36).slice(2, 9),
      type,
      pos: { x: x * TILE_SIZE, y, z: z * TILE_SIZE },
      vel: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
      health: 100,
      maxHealth: 100,
      color: '#fff',
      size: type === EntityType.VEHICLE ? { x: 2.2, y: 1.4, z: 4.8 } : { x: 0.8, y: 1.8, z: 0.8 },
      state: 'idle',
      ...props
    });
  };

  // 5. Populate City
  for (let z = MARGIN; z < MAP_HEIGHT - MARGIN; z++) {
    for (let x = MARGIN; x < MAP_WIDTH - MARGIN; x++) {
      // Safe Zone Check
      if (Math.abs(x - SPAWN_COORDS.x) < 4 && Math.abs(z - SPAWN_COORDS.z) < 4) continue;

      const tile = tiles[z][x];
      
      if (tile === TileType.ROAD) {
         // Traffic
         if (Math.random() < 0.03) {
            const isVertical = Math.abs(x - SPAWN_COORDS.x) % roadInterval === 0;
            addEntity(EntityType.VEHICLE, x, z, { 
                color: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#000000', '#ffffff', '#7c3aed'][Math.floor(Math.random() * 7)],
                rotation: { x:0, y: isVertical ? 0 : Math.PI/2, z:0 }
            });
         }
      } else if (tile === TileType.GRASS) {
          // Determine if near road (for sidewalk/props)
          const isNearRoad = 
             (x > 0 && tiles[z][x-1] === TileType.ROAD) ||
             (x < MAP_WIDTH-1 && tiles[z][x+1] === TileType.ROAD) ||
             (z > 0 && tiles[z-1][x] === TileType.ROAD) ||
             (z < MAP_HEIGHT-1 && tiles[z+1][x] === TileType.ROAD);

          if (isNearRoad) {
              // Street Lights & Hydrants
              if (Math.random() < 0.15) {
                  const isLight = Math.random() > 0.5;
                  addEntity(EntityType.PROP, x, z, {
                      propType: isLight ? 'streetlight' : 'hydrant',
                      size: isLight ? { x: 0.5, y: 6, z: 0.5 } : { x: 0.5, y: 0.8, z: 0.5 },
                      pos: { x: x * TILE_SIZE, y: 0, z: z * TILE_SIZE }
                  });
              } else if (Math.random() < 0.1) {
                  // Street Signs
                  addEntity(EntityType.PROP, x, z, {
                      propType: 'sign',
                      size: { x: 0.5, y: 3, z: 0.5 },
                      color: Math.random() > 0.7 ? 'red' : 'green', // Stop vs Name
                      rotation: { x: 0, y: Math.random() * Math.PI, z: 0 },
                      pos: { x: x * TILE_SIZE, y: 0, z: z * TILE_SIZE }
                  });
              } else if (Math.random() < 0.05) {
                   // Parked Car (On sidewalk edge / shoulder)
                   addEntity(EntityType.VEHICLE, x, z, {
                      color: ['#1f2937', '#374151', '#4b5563'][Math.floor(Math.random() * 3)], // Dull colors for parked
                      rotation: { x:0, y: Math.random() * 0.5, z:0 },
                      pos: { x: x * TILE_SIZE, y: 0.2, z: z * TILE_SIZE } // Lifted slightly for curb
                   });
              }
          } else {
             // Buildings (Inner block) - Increased density for better visibility
             if (Math.random() < 0.6) {
                const rand = Math.random();
                let bType: 'skyscraper' | 'residential' | 'commercial' | 'industrial' = 'commercial';
                let height = 6 + Math.random() * 6;
                let color = '#57534e';

                if (rand > 0.94) {
                    bType = 'skyscraper';
                    height = 25 + Math.random() * 20;
                    color = '#334155';
                } else if (rand > 0.65) {
                    bType = 'residential';
                    height = 6 + Math.random() * 4;
                    color = ['#9a3412', '#7c2d12', '#b45309', '#be123c'][Math.floor(Math.random() * 4)];
                } else if (rand > 0.50) {
                    bType = 'industrial';
                    height = 8 + Math.random() * 4;
                    color = ['#3f3f46', '#52525b', '#27272a'][Math.floor(Math.random() * 3)];
                } else {
                    // Commercial
                    height = 8 + Math.random() * 8;
                    color = ['#57534e', '#52525b', '#4b5563'][Math.floor(Math.random() * 3)];
                }

                addEntity(EntityType.BUILDING, x, z, { 
                    buildingType: bType,
                    size: { x: 8, y: height, z: 8 }, 
                    color: color, 
                    pos: { x: x * TILE_SIZE, y: height / 2, z: z * TILE_SIZE } 
                });
             }
             // Park Trees
             if (Math.random() < 0.05) {
                 addEntity(EntityType.PROP, x, z, {
                    propType: 'tree',
                    size: { x: 3, y: 6 + Math.random()*4, z: 3 },
                    color: '#065f46',
                    pos: { x: x * TILE_SIZE, y: 0, z: z * TILE_SIZE }
                 });
             }
          }

          // NPCs
          if (Math.random() < 0.02) {
             const factions: ('civilian' | 'groves' | 'ballas')[] = ['civilian', 'groves', 'ballas'];
             const faction = factions[Math.floor(Math.random() * factions.length)];
             
             let accessory: 'none' | 'hat' | 'backpack' | 'bandana' = 'none';
             if (faction === 'groves' || faction === 'ballas') accessory = 'bandana';
             else if (Math.random() > 0.7) accessory = 'backpack';

             addEntity(EntityType.GANG_MEMBER, x, z, { 
                 faction, 
                 color: FACTION_COLORS[faction],
                 type: faction === 'civilian' ? EntityType.CIVILIAN : EntityType.GANG_MEMBER,
                 accessory
             });
          }
      }
    }
  }

  return {
    map: { width: MAP_WIDTH, height: MAP_HEIGHT, tileSize: TILE_SIZE, tiles, elevations },
    entities
  };
};