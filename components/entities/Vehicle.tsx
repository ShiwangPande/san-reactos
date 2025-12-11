import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Entity, GameState } from '../../types';

const CULL_DISTANCE = 150;

interface VehicleProps {
    entity: Entity;
    lightsOn: boolean;
    stateRef: React.MutableRefObject<GameState>;
}

const Wheel = ({ position }: { position: [number, number, number] }) => (
    <group position={position}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.25, 16]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0.13, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.05, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.13, 0, 0]}>
             <cylinderGeometry args={[0.2, 0.2, 0.05, 8]} />
             <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
        </mesh>
    </group>
);

const Vehicle: React.FC<VehicleProps> = ({ entity, lightsOn, stateRef }) => {
    const groupRef = useRef<THREE.Group>(null);
    const w = entity.size.x * 0.45; // Wheel offset width
    const l = entity.size.z * 0.35; // Wheel offset length
    
    useFrame((state, delta) => {
        if (groupRef.current) {
            const playerPos = stateRef.current.player.pos;
            const distSq = (entity.pos.x - playerPos.x)**2 + (entity.pos.z - playerPos.z)**2;
            const visible = distSq < CULL_DISTANCE ** 2;
            groupRef.current.visible = visible;
            
            // Skip updates if culled
            if (!visible) return;

            groupRef.current.position.lerp(new THREE.Vector3(entity.pos.x, entity.pos.y, entity.pos.z), 25 * delta);
            let rotDiff = entity.rotation.y - groupRef.current.rotation.y;
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            groupRef.current.rotation.y += rotDiff * 15 * delta;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Body */}
            <mesh castShadow receiveShadow position={[0, 0.7, 0]}>
                <boxGeometry args={[entity.size.x, 0.7, entity.size.z]} />
                <meshStandardMaterial color={entity.color} metalness={0.4} roughness={0.3} envMapIntensity={1.2} />
            </mesh>
            {/* Cabin/Windows */}
            <mesh position={[0, 1.3, -0.3]} castShadow>
                <boxGeometry args={[entity.size.x * 0.85, 0.6, entity.size.z * 0.5]} />
                <meshStandardMaterial color="#111" metalness={0.8} roughness={0.1} />
            </mesh>
            
            {/* Wheels */}
            <Wheel position={[w, 0.35, l]} />
            <Wheel position={[-w, 0.35, l]} />
            <Wheel position={[w, 0.35, -l]} />
            <Wheel position={[-w, 0.35, -l]} />

            {/* Fake Drop Shadow */}
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI/2, 0, 0]}>
                <planeGeometry args={[entity.size.x + 0.5, entity.size.z + 0.5]} />
                <meshBasicMaterial color="#000" transparent opacity={0.4} />
            </mesh>

            {/* Headlights */}
            {lightsOn && (
                <>
                <mesh position={[0.6, 0.7, 2.5]} rotation={[Math.PI/2, 0, 0]}>
                    <coneGeometry args={[0.5, 4, 16, 1, true]} />
                    <meshBasicMaterial color="#fff" transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
                </mesh>
                <mesh position={[-0.6, 0.7, 2.5]} rotation={[Math.PI/2, 0, 0]}>
                    <coneGeometry args={[0.5, 4, 16, 1, true]} />
                    <meshBasicMaterial color="#fff" transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
                </mesh>
                </>
            )}
        </group>
    );
};

export default Vehicle;
