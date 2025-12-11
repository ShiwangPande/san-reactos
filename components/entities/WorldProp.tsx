import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Entity, GameState } from '../../types';

const CULL_DISTANCE = 150;

interface WorldPropProps {
    entity: Entity;
    isNight: boolean;
    stateRef: React.MutableRefObject<GameState>;
}

const WorldProp: React.FC<WorldPropProps> = ({ entity, isNight, stateRef }) => {
     const groupRef = useRef<THREE.Group>(null);
     
     useFrame(() => {
        if (!groupRef.current) return;
        const playerPos = stateRef.current.player.pos;
        const distSq = (entity.pos.x - playerPos.x)**2 + (entity.pos.z - playerPos.z)**2;
        const visible = distSq < CULL_DISTANCE ** 2;
        groupRef.current.visible = visible;
     });

     // Deterministic randoms for Tree variations
     const treeDetails = useMemo(() => {
        if (entity.propType !== 'tree') return null;
        
        let h = 0;
        for(let i=0; i<entity.id.length; i++) h = Math.imul(31, h) + entity.id.charCodeAt(i) | 0;
        const rng = () => { h = Math.imul(48271, h) | 0; return ((h >>> 1) / 2147483648); };

        const baseColor = new THREE.Color(entity.color || "#15803d");
        return {
            colorBottom: baseColor.clone().multiplyScalar(0.6),
            colorMid: baseColor.clone().multiplyScalar(0.85),
            colorTop: baseColor.clone().multiplyScalar(1.1),
            rot1: rng() * Math.PI,
            rot2: rng() * Math.PI,
            rot3: rng() * Math.PI,
            scaleNoise: 0.9 + rng() * 0.2
        };
     }, [entity.id, entity.color, entity.propType]);

     if (entity.propType === 'tree' && treeDetails) {
         const { x, y } = entity.size;
         const trunkH = y * 0.35;
         const leavesRad = x * 0.8 * treeDetails.scaleNoise;
         
         return (
             <group ref={groupRef} position={[entity.pos.x, entity.pos.y, entity.pos.z]}>
                 {/* Trunk */}
                 <mesh castShadow receiveShadow position={[0, trunkH/2, 0]}>
                     <cylinderGeometry args={[x * 0.15, x * 0.2, trunkH, 6]} />
                     <meshStandardMaterial color="#3f2e26" roughness={1.0} />
                 </mesh>

                 {/* Foliage Stack */}
                 <group position={[0, trunkH * 0.8, 0]}>
                     {/* Bottom Layer (Dark & Wide) */}
                     <mesh castShadow receiveShadow position={[0, 0, 0]} rotation={[0, treeDetails.rot1, 0]}>
                         <dodecahedronGeometry args={[leavesRad]} />
                         <meshStandardMaterial color={treeDetails.colorBottom} roughness={0.9} flatShading />
                     </mesh>
                     
                     {/* Middle Layer (Base Color) */}
                     <mesh castShadow receiveShadow position={[0, leavesRad * 0.8, 0]} rotation={[0, treeDetails.rot2, 0]}>
                         <dodecahedronGeometry args={[leavesRad * 0.85]} />
                         <meshStandardMaterial color={treeDetails.colorMid} roughness={0.9} flatShading />
                     </mesh>
                     
                     {/* Top Layer (Light & Small) */}
                     <mesh castShadow receiveShadow position={[0, leavesRad * 1.5, 0]} rotation={[0, treeDetails.rot3, 0]}>
                         <dodecahedronGeometry args={[leavesRad * 0.5]} />
                         <meshStandardMaterial color={treeDetails.colorTop} roughness={0.9} flatShading />
                     </mesh>
                 </group>
             </group>
         );
     }

     if (entity.propType === 'streetlight') {
        const lightColor = "#fdba74"; // Warm Orange Sodium Vapor look
        
        return (
            <group ref={groupRef} position={[entity.pos.x, entity.pos.y, entity.pos.z]}>
                {/* Pole */}
                <mesh castShadow position={[0, 3, 0]}>
                    <cylinderGeometry args={[0.1, 0.15, 6]} />
                    <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.4} />
                </mesh>
                
                {/* Arm */}
                <mesh position={[0, 5.8, 0.5]} rotation={[Math.PI/4, 0, 0]}>
                     <boxGeometry args={[0.25, 0.1, 1.4]} />
                     <meshStandardMaterial color="#1f2937" />
                </mesh>
                
                {/* Light Fixture */}
                <mesh position={[0, 5.7, 0.9]} rotation={[Math.PI/4, 0, 0]}>
                    <boxGeometry args={[0.3, 0.1, 0.5]} />
                    <meshStandardMaterial color="#4b5563" />
                </mesh>

                {/* The Bulb (Bright Source) */}
                <mesh position={[0, 5.6, 1.1]} rotation={[Math.PI/2, 0, 0]}>
                    <planeGeometry args={[0.3, 0.3]} />
                    <meshBasicMaterial color={lightColor} toneMapped={false} />
                </mesh>

                {isNight && (
                    <>
                        {/* Actual Light Source */}
                        <spotLight 
                            position={[0, 5.6, 1.1]} 
                            target-position={[0, 0, 1.1]}
                            color={lightColor} 
                            intensity={12} 
                            distance={18} 
                            angle={0.8} 
                            penumbra={0.5} 
                            castShadow={false} 
                        />
                        
                        {/* Volumetric Fake Fog Cone */}
                        <mesh position={[0, 2.5, 1.1]} rotation={[0, 0, 0]}>
                            <coneGeometry args={[2.5, 6, 32, 1, true]} />
                            <meshBasicMaterial 
                                color={lightColor} 
                                transparent 
                                opacity={0.15} 
                                depthWrite={false} 
                                blending={THREE.AdditiveBlending} 
                                side={THREE.DoubleSide}
                            />
                        </mesh>
                        
                        {/* Floor Light Pool */}
                        <mesh position={[0, 0.05, 1.1]} rotation={[-Math.PI/2, 0, 0]}>
                            <circleGeometry args={[2.5, 16]} />
                            <meshBasicMaterial color={lightColor} transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} />
                        </mesh>
                    </>
                )}
            </group>
        );
    }
    
    if (entity.propType === 'sign') {
        const isStop = entity.color === 'red';
        
        return (
            <group ref={groupRef} position={[entity.pos.x, entity.pos.y, entity.pos.z]} rotation={[0, entity.rotation.y, 0]}>
                {/* Pole */}
                <mesh castShadow position={[0, 1.5, 0]}>
                     <cylinderGeometry args={[0.05, 0.05, 3]} />
                     <meshStandardMaterial color="#94a3b8" metalness={0.6} />
                </mesh>
                
                {isStop ? (
                    // STOP Sign
                    <mesh position={[0, 2.8, 0.06]} rotation={[0,0,Math.PI/8]}>
                        <cylinderGeometry args={[0.4, 0.4, 0.05, 8]} />
                        <meshStandardMaterial color="#ef4444" roughness={0.5} />
                        <mesh position={[0, 0.03, 0]} rotation={[0, 0, -Math.PI/8]}>
                             <boxGeometry args={[0.5, 0.15, 0.01]} />
                             <meshBasicMaterial color="white" />
                        </mesh>
                    </mesh>
                ) : (
                    // Street Name Sign
                    <mesh position={[0, 2.8, 0.06]}>
                        <boxGeometry args={[0.9, 0.3, 0.05]} />
                        <meshStandardMaterial color="#047857" roughness={0.4} />
                        <mesh position={[0, 0, 0.03]}>
                             <boxGeometry args={[0.7, 0.08, 0.01]} />
                             <meshBasicMaterial color="#e2e8f0" />
                        </mesh>
                    </mesh>
                )}
            </group>
        )
    }

    // Generic Prop (Hydrant, etc.)
     return (
        <group ref={groupRef} position={[entity.pos.x, entity.pos.y, entity.pos.z]}>
            <mesh castShadow position={[0, entity.size.y/2, 0]}>
                 <cylinderGeometry args={[entity.size.x/4, entity.size.x/3, entity.size.y]} />
                 <meshStandardMaterial color="#3e2723" roughness={1} />
            </mesh>
            <mesh position={[0, entity.size.y * 0.8, 0]}>
                  <dodecahedronGeometry args={[entity.size.x]} />
                  <meshStandardMaterial color={entity.color || "#166534"} roughness={0.8} />
             </mesh>
        </group>
    );
};

export default WorldProp;