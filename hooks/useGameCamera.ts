import { useRef, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameState, EntityType, GameSettings } from '../types';
import { damp, intersectRayAABB } from '../utils/math';

const CAMERA_MODES = [
  { name: 'NORMAL', dist: 5.5 },
  { name: 'CLOSE', dist: 3 },
  { name: 'FAR', dist: 10 },
  { name: 'CINEMATIC', dist: 8 }, 
];

const BASE_SENSITIVITY = 0.00004;

export const useGameCamera = (stateRef: React.MutableRefObject<GameState>, sub: any, settings: GameSettings) => {
    const { camera, gl } = useThree();
    const [viewModeIndex, setViewModeIndex] = useState(0);
    
    const camRotation = useRef({ yaw: Math.PI, pitch: 0.2 });
    const currentCamDist = useRef(CAMERA_MODES[0].dist);
    const camLookAt = useRef(new THREE.Vector3());
    const camPos = useRef(new THREE.Vector3());
    const mouseDelta = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const unsubscribe = sub((state: any) => state.view, (pressed: boolean) => { if (pressed) setViewModeIndex((prev) => (prev + 1) % CAMERA_MODES.length); });
        
        const onMouseMove = (e: MouseEvent) => {
            if (document.pointerLockElement === gl.domElement) {
                mouseDelta.current.x += e.movementX;
                mouseDelta.current.y += e.movementY;
            }
        };
        document.addEventListener('mousemove', onMouseMove);
        return () => { 
            unsubscribe(); 
            document.removeEventListener('mousemove', onMouseMove); 
        };
    }, [gl.domElement, sub]);

    useFrame((state, delta) => {
        const player = stateRef.current.player;
        const mode = CAMERA_MODES[viewModeIndex];
        const targetDist = player.vehicleId ? 9 : mode.dist;
        const pivotY = player.vehicleId ? 1.5 : 1.7;

        // Apply sensitivity setting (1-100)
        const sensMultiplier = settings.gameplay.sensitivity * BASE_SENSITIVITY;
        const invertMultiplier = settings.gameplay.invertY ? -1 : 1;

        camRotation.current.yaw -= mouseDelta.current.x * sensMultiplier;
        camRotation.current.pitch += mouseDelta.current.y * sensMultiplier * invertMultiplier;
        camRotation.current.pitch = Math.max(0.05, Math.min(Math.PI / 2 - 0.05, camRotation.current.pitch));
        mouseDelta.current.x = 0; mouseDelta.current.y = 0;

        const pivotPos = new THREE.Vector3(player.pos.x, player.pos.y + pivotY, player.pos.z);
        const yaw = camRotation.current.yaw;
        const pitch = camRotation.current.pitch;
        const dir = new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch), Math.sin(pitch), Math.cos(yaw)*Math.cos(pitch)).normalize();

        // Camera Collision
        let collisionLimit = targetDist;
        const rayOrigin = pivotPos;
        const nearbySq = 40*40;
        for (const e of stateRef.current.entities) {
             if (e.type !== EntityType.BUILDING) continue;
             if ((e.pos.x-pivotPos.x)**2 + (e.pos.z-pivotPos.z)**2 > nearbySq) continue;
             const b = 0.5;
             const t = intersectRayAABB(rayOrigin, dir, 
                new THREE.Vector3(e.pos.x-e.size.x/2-b, e.pos.y-e.size.y/2-b, e.pos.z-e.size.z/2-b),
                new THREE.Vector3(e.pos.x+e.size.x/2+b, e.pos.y+e.size.y/2+b, e.pos.z+e.size.z/2+b)
             );
             if (t!==null && t < collisionLimit) collisionLimit = Math.max(0.5, t);
        }
        
        const lambda = collisionLimit < currentCamDist.current ? 40 : 4;
        currentCamDist.current = damp(currentCamDist.current, collisionLimit, lambda, delta);
        const targetCamPos = pivotPos.clone().add(dir.multiplyScalar(currentCamDist.current));
        
        camPos.current.lerp(targetCamPos, 1 - Math.exp(-25 * delta));
        camLookAt.current.lerp(pivotPos, 1 - Math.exp(-20 * delta));
        
        camera.position.copy(camPos.current);
        camera.lookAt(camLookAt.current);
    });

    return { camRotation };
};