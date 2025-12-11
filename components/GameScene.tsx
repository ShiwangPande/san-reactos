import React, { useRef, useState, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { EntityType, GameState, Vector3, WeaponType, Entity, TileType, GameSettings } from '../types';
import { TIME_SPEED, PLAYER_ACCEL, PLAYER_FRICTION, PLAYER_MAX_SPEED, VEHICLE_ACCEL, VEHICLE_BRAKE, VEHICLE_FRICTION, VEHICLE_STEER_SPEED, VEHICLE_MAX_SPEED, TILE_SIZE } from '../constants';
import { SPAWN_COORDS } from '../utils/worldGen';
import { damp } from '../utils/math';
import { checkCollision } from '../utils/physics';

import Environment from './world/Environment';
import CityMap from './world/CityMap';
import Lighting from './world/Lighting';
import Building from './entities/Building';
import Vehicle from './entities/Vehicle';
import Character from './entities/Character';
import WorldProp from './entities/WorldProp';
import Projectile from './entities/Projectile';

import { useBuildingTextures } from '../hooks/useProceduralTextures';
import { useGameCamera } from '../hooks/useGameCamera';
import { audioManager } from '../utils/audio';

interface GameSceneProps {
    stateRef: React.MutableRefObject<GameState>;
    onUpdateState: (state: Partial<GameState>) => void;
    isMenuOpen: boolean;
    settings: GameSettings;
}

const GameScene: React.FC<GameSceneProps> = ({ stateRef, onUpdateState, isMenuOpen, settings }) => {
    const { gl } = useThree();
    const [sub, getKeys] = useKeyboardControls();
    const [isNight, setIsNight] = useState(false);
    
    // Force re-render when entities (like bullets) are added/removed
    const [tick, setTick] = useState(0); 

    // Assets
    const buildingTextures = useBuildingTextures(); 

    // Hooks
    const { camRotation } = useGameCamera(stateRef, sub, settings);

    const lastShootTime = useRef(0);
    const lastStepTime = useRef(0);
    const wasDrifting = useRef(false);
    
    // Death Handling
    const isWasted = useRef(false);

    // Initial Audio & Music Setup
    useEffect(() => {
        // Resume on mount (if not already)
        audioManager.resume();
        audioManager.setMusic('exploration');
        
        return () => {
             audioManager.setMusic('none');
        }
    }, []);

    useEffect(() => {
        const onMouseDown = (e: MouseEvent) => {
             // CRITICAL: Do not request pointer lock if menu is open
             if (isMenuOpen || isWasted.current) return;

             if (document.pointerLockElement !== gl.domElement) {
                 const promise = gl.domElement.requestPointerLock() as unknown as Promise<void>;
                 if (promise && typeof promise.catch === 'function') {
                     promise.catch(() => { /* Ignore interruption */ });
                 }
                 return;
             }
             handleAttack();
        };

        const onKeyDown = (e: KeyboardEvent) => {
             if (isWasted.current) return;
             // Horn
             if ((e.key === 'h' || e.key === 'H') && stateRef.current.player.vehicleId) {
                 audioManager.playHorn();
             }
        };

        // Attach listener to document to catch clicks anywhere, but we filter with isMenuOpen
        document.addEventListener('mousedown', onMouseDown);
        window.addEventListener('keydown', onKeyDown);
        return () => { 
            document.removeEventListener('mousedown', onMouseDown); 
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [gl.domElement, isMenuOpen]); // Re-bind if menu state changes

    // Melee combo tracking
    const meleeComboCount = useRef(0);
    const lastMeleeTime = useRef(0);
    const meleeComboResetTime = 1000; // Reset combo after 1 second

    const handleAttack = () => {
        const s = stateRef.current;
        const player = s.player;
        if (player.state === 'driving' || player.state === 'dead') return;

        const now = performance.now();
        const weapon = player.inventory?.[0] || WeaponType.FIST;

        if (weapon !== WeaponType.FIST) {
            // Ranged weapon logic
            if (now - lastShootTime.current < 200) return; // Fire rate limit
            lastShootTime.current = now;

            audioManager.playShot(); // SFX
             
            // Combat music trigger logic could go here (e.g. if shots fired near cops)
            if (s.wantedLevel === 0) {
                s.wantedLevel = 1; // Instant wanted level for shooting
                onUpdateState({ wantedLevel: 1 });
            }

            const yaw = player.rotation.y;
            const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
            const spawnPos = new THREE.Vector3(player.pos.x, 1.5, player.pos.z).add(dir.multiplyScalar(0.5));
             
            const bullet: Entity = {
                id: Math.random().toString(36),
                type: EntityType.PROJECTILE,
                pos: { x: spawnPos.x, y: spawnPos.y, z: spawnPos.z },
                vel: { x: dir.x * 40, y: 0, z: dir.z * 40 },
                size: { x: 0.1, y: 0.1, z: 0.1 },
                color: 'yellow',
                health: 1,
                maxHealth: 1,
                rotation: { x:0, y:0, z:0 },
                state: 'idle'
            };
             
            s.entities.push(bullet);
            setTick(t => t + 1);
        } else {
            // FIST BUMP / MELEE ATTACK
            const meleeCooldown = 400; // Faster than ranged
            if (now - lastShootTime.current < meleeCooldown) return;
            
            // Reset combo if too much time passed
            if (now - lastMeleeTime.current > meleeComboResetTime) {
                meleeComboCount.current = 0;
                onUpdateState({ meleeCombo: 0 });
            }
            
            lastShootTime.current = now;
            lastMeleeTime.current = now;
            meleeComboCount.current = (meleeComboCount.current + 1) % 4; // 0-3 combo hits
            
            // Play punch sound
            audioManager.playUI('punch');
            
            // Melee attack range and damage (balanced for GTA-style gameplay)
            const attackRange = 2.5;
            const baseDamage = 8; // Reduced from 15 for better balance
            const comboMultiplier = 1 + (meleeComboCount.current * 0.25); // 1x, 1.25x, 1.5x, 1.75x (slightly reduced)
            const damage = Math.floor(baseDamage * comboMultiplier);
            
            const yaw = player.rotation.y;
            const attackDir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
            const attackPos = new THREE.Vector3(player.pos.x, player.pos.y + 1.2, player.pos.z);
            
            // Check for nearby entities to hit
            let hitSomething = false;
            for (const target of s.entities) {
                if (target.id === player.id || target.state === 'dead') continue;
                if (target.type === EntityType.PROJECTILE || target.type === EntityType.ITEM_WEAPON) continue;
                if (target.type === EntityType.BUILDING || target.type === EntityType.PROP) continue;
                
                const dx = target.pos.x - attackPos.x;
                const dz = target.pos.z - attackPos.z;
                const dist = Math.sqrt(dx*dx + dz*dz);
                
                // Check if target is in front of player and within range
                const toTarget = new THREE.Vector3(dx, 0, dz).normalize();
                const dot = attackDir.dot(toTarget);
                
                if (dist < attackRange && dot > 0.5) { // 60 degree cone in front
                    hitSomething = true;
                    
                    // Apply damage
                    target.health -= damage;
                    if (target.health <= 0) {
                        target.state = 'dead';
                        target.health = 0;
                        // Drop money or items on death
                        if (target.type === EntityType.CIVILIAN || target.type === EntityType.GANG_MEMBER) {
                            s.money += Math.floor(Math.random() * 50) + 20;
                        }
                    }
                    
                    // Knockback effect
                    const knockbackForce = 8 * comboMultiplier;
                    target.vel.x += attackDir.x * knockbackForce;
                    target.vel.z += attackDir.z * knockbackForce;
                    
                    // Update wanted level if hitting civilians/police
                    if (target.type === EntityType.CIVILIAN || target.type === EntityType.POLICE) {
                        if (s.wantedLevel < 2) {
                            s.wantedLevel = 2;
                            onUpdateState({ wantedLevel: 2 });
                        }
                    }
                    
                    onUpdateState({ 
                        player: { ...player },
                        entities: [...s.entities],
                        money: s.money
                    });
                    break; // Only hit one target per punch
                }
            }
            
                    // Set player to punching state briefly
            player.state = 'punching';
            setTimeout(() => {
                if (player.state === 'punching') {
                    player.state = 'idle';
                    onUpdateState({ player: { ...player } });
                }
            }, 200);
            
            // Update combo in state for HUD
            onUpdateState({ 
                player: { ...player },
                meleeCombo: meleeComboCount.current + 1
            });
            
            // Visual feedback
            if (hitSomething) {
                console.log(`Punch hit! Combo: ${meleeComboCount.current + 1}, Damage: ${damage}`);
            }
        }
    };

    const handleDeath = () => {
        if (isWasted.current) return;
        isWasted.current = true;
        const s = stateRef.current;
        s.player.state = 'dead';
        onUpdateState({ player: { ...s.player } }); // Trigger UI update in App.tsx to show Wasted screen
        
        // Respawn Logic
        setTimeout(() => {
            s.player.health = 100;
            s.player.state = 'idle';
            s.player.pos = { x: SPAWN_COORDS.x * TILE_SIZE, y: 0.5, z: SPAWN_COORDS.z * TILE_SIZE };
            s.player.vel = { x: 0, y: 0, z: 0 };
            s.player.vehicleId = null; // Eject if in car
            s.wantedLevel = 0;
            isWasted.current = false;
            onUpdateState({ player: { ...s.player }, wantedLevel: 0 });
        }, 4000); // 4 seconds wasted screen
    };

    // --- GAME LOOP ---
    useFrame((state, delta) => {
        const s = stateRef.current;
        const player = s.player;
        
        if (isWasted.current) return; // Stop physics updates when dead

        const keys = getKeys();

        // 1. Time & Environment (Improved day/night cycle)
        s.timeOfDay += TIME_SPEED * delta * 60; // Scale by delta for consistent speed
        if (s.timeOfDay >= 1440) s.timeOfDay = 0;
        
        // Better day/night detection with smoother transitions
        // Dawn: 5:00-7:00 (300-420), Day: 7:00-19:00 (420-1140), Dusk: 19:00-21:00 (1140-1260), Night: 21:00-5:00 (1260-300)
        const currentIsNight = s.timeOfDay >= 1260 || s.timeOfDay < 420;
        if (currentIsNight !== isNight) {
            setIsNight(currentIsNight);
            // Smooth transition notification
            console.log(`Time: ${Math.floor(s.timeOfDay/60)}:${Math.floor(s.timeOfDay%60).toString().padStart(2,'0')} - ${currentIsNight ? 'Night' : 'Day'}`);
        }

        // Update Ambience SFX
        audioManager.updateAmbiance(currentIsNight);
        
        // Dynamic Music Switching
        const targetTheme = (s.wantedLevel > 0) ? 'combat' : 'exploration';
        audioManager.setMusic(targetTheme);
        
        // Siren SFX if wanted
        audioManager.updateSiren(s.wantedLevel > 0);

        if (Math.floor(s.timeOfDay) % 60 === 0) {
             onUpdateState({ timeOfDay: s.timeOfDay, player: { ...s.player }, money: s.money });
        }

        // 2. Projectile Logic
        for (let i = s.entities.length - 1; i >= 0; i--) {
            const e = s.entities[i];
            if (e.type === EntityType.PROJECTILE) {
                e.pos.x += e.vel.x * delta;
                e.pos.z += e.vel.z * delta;
                
                let hit = false;
                for (const target of s.entities) {
                    if (target.id === e.id || target.type === EntityType.PROJECTILE || target.type === EntityType.ITEM_WEAPON) continue;
                    if (target.type === EntityType.PLAYER) continue;
                    
                    const dx = e.pos.x - target.pos.x;
                    const dz = e.pos.z - target.pos.z;
                    if (dx*dx + dz*dz < (target.size.x/2 + 0.5)**2) {
                        hit = true;
                        if (target.health > 0) {
                            target.health -= 25;
                            if (target.health <= 0) target.state = 'dead';
                            // SFX Hit?
                        }
                        break;
                    }
                }
                
                const distFromPlayer = (e.pos.x - player.pos.x)**2 + (e.pos.z - player.pos.z)**2;
                if (hit || distFromPlayer > 10000) {
                    s.entities.splice(i, 1);
                    setTick(t => t + 1);
                }
            }
        }

        // 3. Weapon Pickup Logic
        if (!player.vehicleId) {
             const pickupRange = 1.5;
             for (let i = s.entities.length - 1; i >= 0; i--) {
                 const e = s.entities[i];
                 if (e.type === EntityType.ITEM_WEAPON) {
                     const dx = e.pos.x - player.pos.x;
                     const dz = e.pos.z - player.pos.z;
                     if (dx*dx + dz*dz < pickupRange * pickupRange) {
                         const newWeapon = e.inventory?.[0];
                         if (newWeapon) {
                             audioManager.playReload(); // SFX
                             player.inventory = [newWeapon];
                             s.entities.splice(i, 1);
                             onUpdateState({ player: { ...player } });
                             setTick(t => t + 1);
                         }
                     }
                 }
             }
        }

        // 4. Physics & Input
        const playerSpeed = Math.sqrt(player.vel.x**2 + player.vel.z**2);

        // --- DROWNING CHECK ---
        const tileX = Math.floor(player.pos.x / TILE_SIZE);
        const tileZ = Math.floor(player.pos.z / TILE_SIZE);
        // Bounds check
        if (tileX >= 0 && tileX < s.map.width && tileZ >= 0 && tileZ < s.map.height) {
            const currentTile = s.map.tiles[tileZ][tileX];
            
            if (currentTile === TileType.WATER && !player.vehicleId) {
                // Sinking effect
                player.pos.y = damp(player.pos.y, -1.2, 2, delta);
                // Slow movement in water
                player.vel.x *= 0.9;
                player.vel.z *= 0.9;
                
                // Drowning Damage
                player.health -= 25 * delta; // 4 seconds to die
                onUpdateState({ player: { ...player } });

                if (player.health <= 0) {
                    handleDeath();
                    return; // Skip rest of frame
                }
            } else if (!player.vehicleId) {
                // Normal Ground Height - Position character so feet touch ground
                // Character model: root at bottom, hips at 0.94, total height ~1.8
                // Feet are approximately at root position
                const groundElevation = s.map.elevations[tileZ][tileX];
                const groundH = groundElevation + 0.05; // Small offset to ensure feet touch ground
                player.pos.y = damp(player.pos.y, groundH, 10, delta);
            }
        } else {
             // Out of map bounds - Instant death
             player.health = 0;
             handleDeath();
             return;
        }

        if (player.state === 'entering_vehicle' && player.targetEntityId) {
             const car = s.entities.find(e => e.id === player.targetEntityId);
             if (car) {
                 const offset = new THREE.Vector3(-1.5, 0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), car.rotation.y);
                 const targetX = car.pos.x + offset.x;
                 const targetZ = car.pos.z + offset.z;
                 const dx = targetX - player.pos.x;
                 const dz = targetZ - player.pos.z;
                 const dist = Math.sqrt(dx*dx + dz*dz);
                 
                 if (dist < 0.5) {
                     player.vehicleId = car.id;
                     car.vehicleId = player.id;
                     player.state = 'driving';
                     player.targetEntityId = undefined;
                     player.vel = {x:0, y:0, z:0};
                     player.pos = { ...car.pos };
                     audioManager.playUI('click'); // Door sound shim
                 } else {
                     const speed = 6 * delta;
                     player.pos.x += (dx/dist) * speed;
                     player.pos.z += (dz/dist) * speed;
                     player.rotation.y = Math.atan2(dx, dz);
                     player.vel = { x: (dx/dist)*5, y:0, z: (dz/dist)*5 };
                 }
             } else { player.state = 'idle'; }
        } else if (player.state === 'exiting_vehicle' && player.targetPos) {
                 const dx = player.targetPos.x - player.pos.x;
                 const dz = player.targetPos.z - player.pos.z;
                 const dist = Math.sqrt(dx*dx + dz*dz);
                 if (dist < 0.2) {
                     player.state = 'idle';
                     player.targetPos = undefined;
                     player.vel = {x:0, y:0, z:0};
                 } else {
                     const speed = 4 * delta;
                     player.pos.x += (dx/dist) * speed;
                     player.pos.z += (dz/dist) * speed;
                     player.rotation.y = Math.atan2(dx, dz);
                     player.vel = { x: (dx/dist)*4, y:0, z: (dz/dist)*4 };
                 }
        } else if (player.vehicleId) {
             const car = s.entities.find(e => e.id === player.vehicleId);
             if (car) {
                 const forward = new THREE.Vector3(Math.sin(car.rotation.y), 0, Math.cos(car.rotation.y));
                 let force = 0;
                 if (keys.forward) force += VEHICLE_ACCEL;
                 if (keys.backward) force -= VEHICLE_BRAKE;
                 
                 car.vel.x += forward.x * force * delta; car.vel.z += forward.z * force * delta;
                 car.vel.x -= car.vel.x * VEHICLE_FRICTION * delta; car.vel.z -= car.vel.z * VEHICLE_FRICTION * delta;
                 
                 const speed = Math.sqrt(car.vel.x**2 + car.vel.z**2);
                 // SFX: Engine
                 audioManager.updateEngine(speed, true);

                 // Drifting / Skidding Logic
                 const latSpeed = Math.abs(car.vel.x * Math.cos(car.rotation.y) - car.vel.z * Math.sin(car.rotation.y));
                 if (latSpeed > 2 && speed > 5) {
                    if (!wasDrifting.current) {
                        audioManager.playSkid();
                        wasDrifting.current = true;
                    }
                 } else {
                     wasDrifting.current = false;
                 }

                 if (speed > 0.5) {
                     const steer = (keys.left ? 1 : keys.right ? -1 : 0) * VEHICLE_STEER_SPEED * delta;
                     car.rotation.y += (car.vel.x * forward.x + car.vel.z * forward.z < 0) ? -steer : steer;
                 }
                 const nextX = car.pos.x + car.vel.x * delta;
                 const nextZ = car.pos.z + car.vel.z * delta;
                 
                 if (!checkCollision({x:nextX, y:0, z:car.pos.z} as Vector3, car.size, s.entities, car.id)) car.pos.x = nextX; else { car.vel.x *= -0.5; }
                 if (!checkCollision({x:car.pos.x, y:0, z:nextZ} as Vector3, car.size, s.entities, car.id)) car.pos.z = nextZ; else { car.vel.z *= -0.5; }

                 if (speed > VEHICLE_MAX_SPEED) { const r = VEHICLE_MAX_SPEED/speed; car.vel.x*=r; car.vel.z*=r; }
                 player.pos = {...car.pos}; player.rotation.y = car.rotation.y;
             }
        } else {
             audioManager.updateEngine(0, false); // Stop Engine SFX

             const moveX = Number(keys.right) - Number(keys.left);
             const moveZ = Number(keys.backward) - Number(keys.forward);
             const input = new THREE.Vector3(moveX, 0, moveZ);
             if (input.lengthSq() > 0) {
                 input.normalize().applyAxisAngle(new THREE.Vector3(0,1,0), camRotation.current.yaw);
                 player.vel.x += input.x * PLAYER_ACCEL * delta; player.vel.z += input.z * PLAYER_ACCEL * delta;
                 const speed = Math.sqrt(player.vel.x**2 + player.vel.z**2);
                 if (speed > PLAYER_MAX_SPEED) { const r = PLAYER_MAX_SPEED/speed; player.vel.x*=r; player.vel.z*=r; }
                 const targetRot = Math.atan2(player.vel.x, player.vel.z);
                 let diff = targetRot - player.rotation.y;
                 while (diff > Math.PI) diff -= Math.PI*2; while (diff < -Math.PI) diff += Math.PI*2;
                 player.rotation.y = damp(player.rotation.y, targetRot, 15, delta);
             } else {
                 const d = Math.exp(-PLAYER_FRICTION * delta); player.vel.x *= d; player.vel.z *= d;
             }
             const nextX = player.pos.x + player.vel.x * delta;
             if (!checkCollision({x:nextX, y:0, z:player.pos.z} as Vector3, player.size, s.entities, player.id)) player.pos.x = nextX; else player.vel.x = 0;
             const nextZ = player.pos.z + player.vel.z * delta;
             if (!checkCollision({x:player.pos.x, y:0, z:nextZ} as Vector3, player.size, s.entities, player.id)) player.pos.z = nextZ; else player.vel.z = 0;

             // SFX: Footsteps
             if (playerSpeed > 0.5) {
                const stepRate = 0.6 / (playerSpeed / 5 + 1);
                if (state.clock.elapsedTime - lastStepTime.current > stepRate) {
                    // Check surface
                    const tileX = Math.floor(player.pos.x / 10);
                    const tileZ = Math.floor(player.pos.z / 10);
                    // Safe access map tiles
                    const tileType = s.map.tiles[tileZ]?.[tileX];
                    const surface = (tileType === TileType.GRASS || tileType === TileType.SAND) ? 'grass' : 'road';
                    
                    audioManager.playStep(surface);
                    lastStepTime.current = state.clock.elapsedTime;
                }
             }
        }
    });

    return (
        <>
            <Lighting stateRef={stateRef} isNight={isNight} />
            <Environment isNight={isNight} settings={settings} />
            <CityMap map={stateRef.current.map} />

            {stateRef.current.entities.map(e => {
                 if (e.id === stateRef.current.player.vehicleId) return null;
                 if (e.type === EntityType.VEHICLE) return <Vehicle key={e.id} entity={e} lightsOn={isNight} stateRef={stateRef} />;
                 if (e.type === EntityType.BUILDING) return <Building key={e.id} entity={e} textures={buildingTextures} isNight={isNight} stateRef={stateRef} />;
                 if (e.type === EntityType.PROP) return <WorldProp key={e.id} entity={e} isNight={isNight} stateRef={stateRef} />;
                 if (e.type === EntityType.PROJECTILE) return <Projectile key={e.id} entity={e} />;
                 return <Character key={e.id} entity={e} isPlayer={false} stateRef={stateRef} />;
            })}

            {(!stateRef.current.player.vehicleId) && (
                 <Character entity={stateRef.current.player} isPlayer={true} stateRef={stateRef} />
            )}
            {stateRef.current.player.vehicleId && (() => {
                const car = stateRef.current.entities.find(e => e.id === stateRef.current.player.vehicleId);
                return car ? <Vehicle key="p-car" entity={car} lightsOn={isNight} stateRef={stateRef} /> : null;
            })()}
        </>
    );
};

export default GameScene;