import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Entity, GameState } from '../../types';

const CULL_DISTANCE = 150;

interface BuildingProps {
    entity: Entity;
    textures: { modern: any, brick: any };
    isNight: boolean;
    stateRef: React.MutableRefObject<GameState>;
}

const Building: React.FC<BuildingProps> = ({ entity, textures, isNight, stateRef }) => {
    const groupRef = useRef<THREE.Group>(null);
    
    // Ensure textures are loaded
    if (!textures || !textures.modern || !textures.brick) {
        console.warn('Building textures not loaded yet');
        return null;
    }
    
    // Deterministic architecture props
    const arch = useMemo(() => {
        let h = 0;
        for(let i=0; i<entity.id.length; i++) h = Math.imul(31, h) + entity.id.charCodeAt(i) | 0;
        const rng = () => { h = Math.imul(48271, h) | 0; return ((h >>> 1) / 2147483648); }
        
        const isModern = entity.buildingType === 'skyscraper' || entity.buildingType === 'commercial';
        const texSet = isModern ? textures.modern : textures.brick;

        return {
            hasAntenna: rng() > 0.7,
            hasWaterTower: rng() > 0.8,
            hasVents: rng() > 0.4,
            hasHelipad: entity.buildingType === 'skyscraper' && rng() > 0.8,
            baseColor: new THREE.Color(entity.color),
            texSet: texSet,
            seed: rng(),
        };
    }, [entity.id, entity.color, entity.buildingType, textures]);

    // Reusable Materials (Improved for better GTA-style appearance)
    const mainMat = useMemo(() => (
        <meshStandardMaterial 
            map={arch.texSet.map}
            normalMap={arch.texSet.normalMap}
            roughnessMap={arch.texSet.roughnessMap}
            emissiveMap={arch.texSet.emissiveMap}
            emissive="#ffffff"
            emissiveIntensity={isNight ? 2.5 : 0} 
            color={arch.baseColor}
            roughness={0.8}
            metalness={0.1}
        />
    ), [arch, isNight]);

    const roofMat = useMemo(() => <meshStandardMaterial color="#262626" roughness={0.9} />, []);
    const detailMat = useMemo(() => <meshStandardMaterial color="#4b5563" roughness={0.7} />, []);

    useFrame(() => {
        if (!groupRef.current) return;
        const pPos = stateRef.current.player.pos;
        const distSq = (entity.pos.x - pPos.x)**2 + (entity.pos.z - pPos.z)**2;
        // Increased culling distance for buildings so they're visible from further away
        groupRef.current.visible = distSq < (CULL_DISTANCE * 2) ** 2;
    });

    const { x: w, y: h, z: d } = entity.size;
    const halfH = h / 2;

    const renderRoofProps = () => (
        <group position={[0, halfH, 0]}>
            {arch.hasVents && (
                <mesh position={[w*0.2, 0.4, -d*0.2]} castShadow>
                    <boxGeometry args={[1.5, 0.8, 1.5]} />
                    {detailMat}
                </mesh>
            )}
            {arch.hasWaterTower && (
                <group position={[-w*0.25, 0, d*0.25]}>
                    <mesh position={[0, 1.5, 0]} castShadow>
                         <cylinderGeometry args={[1, 1, 1.5, 12]} />
                         <meshStandardMaterial color="#78716c" />
                    </mesh>
                    <mesh position={[0, 0.75, 0]}>
                        <cylinderGeometry args={[0.1, 0.1, 1.5]} />
                        {detailMat}
                    </mesh>
                </group>
            )}
        </group>
    );

    const renderArchitecture = () => {
        switch(entity.buildingType) {
            case 'skyscraper':
                return (
                    <>
                        {/* Foundation/Base - Simplified and fixed */}
                        <mesh position={[0, -halfH - 0.15, 0]} castShadow receiveShadow>
                            <boxGeometry args={[w + 0.3, 0.3, d + 0.3]} />
                            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
                        </mesh>
                        
                        {/* Main Tower Base */}
                        <mesh position={[0, -halfH + h*0.15, 0]} castShadow receiveShadow material={mainMat}>
                            <boxGeometry args={[w, h*0.4, d]} />
                        </mesh>
                        
                        {/* Middle Section */}
                        <mesh position={[0, 0, 0]} castShadow receiveShadow material={mainMat}>
                            <boxGeometry args={[w*0.9, h*0.4, d*0.9]} />
                        </mesh>
                        
                        {/* Top Taper Section */}
                        <mesh position={[0, halfH - h*0.2, 0]} castShadow receiveShadow material={mainMat}>
                            <boxGeometry args={[w*0.75, h*0.2, d*0.75]} />
                        </mesh>
                        
                        {/* Roof - More defined */}
                        <mesh position={[0, halfH + 0.1, 0]} castShadow receiveShadow material={roofMat}>
                             <boxGeometry args={[w*0.65, 0.4, d*0.65]} />
                        </mesh>
                        
                        {/* Antenna - More realistic */}
                        {arch.hasAntenna && (
                            <group position={[0, halfH + 0.3, 0]}>
                                <mesh castShadow material={detailMat}>
                                    <cylinderGeometry args={[0.2, 0.25, 1, 8]} />
                                </mesh>
                                <mesh position={[0, 0.5, 0]} castShadow material={detailMat}>
                                    <cylinderGeometry args={[0.15, 0.2, 6, 8]} />
                                </mesh>
                                <mesh position={[0, 3.5, 0]} material={detailMat}>
                                    <boxGeometry args={[0.3, 0.5, 0.3]} />
                                </mesh>
                            </group>
                        )}
                        
                        {/* Navigation light for aircraft */}
                        {isNight && arch.hasAntenna && (
                            <pointLight position={[0, halfH + 4, 0]} color="red" distance={40} intensity={4} />
                        )}
                    </>
                );
            case 'residential':
                return (
                    <>
                        {/* Foundation - Simplified */}
                        <mesh position={[0, -halfH - 0.1, 0]} castShadow receiveShadow>
                            <boxGeometry args={[w + 0.2, 0.2, d + 0.2]} />
                            <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
                        </mesh>
                        
                        {/* Main Building Structure */}
                        <mesh position={[0, 0, 0]} castShadow receiveShadow material={mainMat}>
                             <boxGeometry args={[w, h, d]} />
                        </mesh>
                        
                        {/* Simplified Windows - Front Face Only */}
                        {Array.from({ length: Math.min(4, Math.floor(h/3)) }).map((_, i) => {
                            const windowY = -halfH + 2 + (i * 3);
                            if (windowY > halfH - 1.5) return null;
                            return (
                                <group key={`window-${i}`} position={[0, windowY, d/2 + 0.01]}>
                                    {/* Window Frame */}
                                    <mesh material={detailMat}>
                                        <boxGeometry args={[w*0.7, 0.9, 0.06]} />
                                    </mesh>
                                    {/* Window Glass */}
                                    <mesh position={[0, 0, 0.03]}>
                                        <boxGeometry args={[w*0.65, 0.8, 0.02]} />
                                        <meshStandardMaterial 
                                            color={isNight ? "#ffd700" : "#b3d9ff"} 
                                            emissive={isNight ? "#ffd700" : "#000000"}
                                            emissiveIntensity={isNight ? 1.0 : 0}
                                            transparent
                                            opacity={0.8}
                                        />
                                    </mesh>
                                </group>
                            );
                        })}
                        
                        {/* Front Door - Simplified */}
                        <group position={[0, -halfH + 1.2, d/2 + 0.01]}>
                            <mesh castShadow material={detailMat}>
                                <boxGeometry args={[1.0, 2.0, 0.08]} />
                            </mesh>
                            <mesh position={[0, 0, 0.04]}>
                                <boxGeometry args={[0.9, 1.8, 0.02]} />
                                <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
                            </mesh>
                        </group>
                        
                        {/* Parapet - More defined with overhang */}
                        <mesh position={[0, halfH + 0.2, 0]} castShadow receiveShadow material={roofMat}>
                             <boxGeometry args={[w+0.4, 0.5, d+0.4]} />
                        </mesh>
                        {/* Roof Overhang */}
                        <mesh position={[0, halfH + 0.1, 0]} material={roofMat}>
                             <boxGeometry args={[w+0.5, 0.2, d+0.5]} />
                        </mesh>
                        
                        {/* Balconies - More realistic */}
                        {Array.from({ length: Math.floor(h/4) }).map((_, i) => {
                            const balconyY = -halfH + 2.5 + (i * 4);
                            if (balconyY > halfH - 1) return null;
                            return (
                                <group key={`balcony-${i}`} position={[0, balconyY, d/2 + 0.3]}>
                                    {/* Balcony Floor */}
                                    <mesh castShadow receiveShadow material={detailMat}>
                                        <boxGeometry args={[w*0.7, 0.2, 0.7]} />
                                    </mesh>
                                    {/* Balcony Railing */}
                                    <mesh position={[0, 0.6, 0.35]} castShadow material={detailMat}>
                                         <boxGeometry args={[w*0.7, 1.2, 0.08]} />
                                    </mesh>
                                    {/* Railing Posts */}
                                    {[-w*0.3, 0, w*0.3].map((x, j) => (
                                        <mesh key={`post-${j}`} position={[x, 0.3, 0.35]} castShadow material={detailMat}>
                                            <boxGeometry args={[0.08, 0.6, 0.08]} />
                                        </mesh>
                                    ))}
                                </group>
                            );
                        })}
                        {renderRoofProps()}
                    </>
                );
            case 'commercial':
                return (
                    <>
                        {/* Foundation - Simplified */}
                        <mesh position={[0, -halfH - 0.1, 0]} castShadow receiveShadow>
                            <boxGeometry args={[w + 0.2, 0.2, d + 0.2]} />
                            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
                        </mesh>
                        
                        {/* Main Building Structure */}
                        <mesh position={[0, 0, 0]} castShadow receiveShadow material={mainMat}>
                             <boxGeometry args={[w, h, d]} />
                        </mesh>
                        
                        {/* Storefront Window - Simplified */}
                        <group position={[0, -halfH + 2.5, d/2 + 0.01]}>
                            <mesh material={detailMat}>
                                <boxGeometry args={[w*0.9, 3.5, 0.06]} />
                            </mesh>
                            <mesh position={[0, 0, 0.03]}>
                                <boxGeometry args={[w*0.85, 3.3, 0.02]} />
                                <meshStandardMaterial 
                                    color={isNight ? "#ffff00" : "#e0f2fe"} 
                                    emissive={isNight ? "#ffff00" : "#000000"}
                                    emissiveIntensity={isNight ? 1.5 : 0}
                                    transparent
                                    opacity={0.85}
                                />
                            </mesh>
                        </group>
                        
                        {/* Simple Awning */}
                        <group position={[0, -halfH + 1.5, d/2 + 0.6]}>
                             <mesh rotation={[0.15, 0, 0]} castShadow receiveShadow>
                                 <boxGeometry args={[w*0.95, 0.2, 1.4]} />
                                 <meshStandardMaterial color={arch.baseColor} roughness={0.6} />
                             </mesh>
                             {/* Simple Supports */}
                             {[-w*0.4, w*0.4].map((x, i) => (
                                 <mesh key={`support-${i}`} position={[x, -0.3, 0]} castShadow material={detailMat}>
                                     <cylinderGeometry args={[0.1, 0.1, 0.6, 8]} />
                                 </mesh>
                             ))}
                        </group>
                        
                        {/* Signage - Simplified */}
                        <mesh position={[0, halfH - 1.5, d/2 + 0.1]} castShadow>
                             <boxGeometry args={[w*0.85, 1.5, 0.15]} />
                             <meshStandardMaterial 
                                 color={isNight ? "#ff6b00" : "#1a1a1a"} 
                                 emissive={isNight ? "#ff6b00" : "#000000"}
                                 emissiveIntensity={isNight ? 1.5 : 0}
                             />
                        </mesh>
                        {renderRoofProps()}
                    </>
                );
            case 'industrial':
                 return (
                    <>
                        {/* Foundation - Simplified */}
                        <mesh position={[0, -halfH - 0.1, 0]} castShadow receiveShadow>
                            <boxGeometry args={[w + 0.2, 0.2, d + 0.2]} />
                            <meshStandardMaterial color="#1a1a1a" roughness={0.95} />
                        </mesh>
                        
                        {/* Main Building Structure */}
                         <mesh position={[0, 0, 0]} castShadow receiveShadow material={mainMat}>
                             <boxGeometry args={[w, h, d]} />
                         </mesh>
                         
                         {/* Simple Industrial Windows */}
                         {Array.from({ length: Math.min(3, Math.floor(h/4)) }).map((_, i) => {
                             const windowY = -halfH + 3 + (i * 4);
                             if (windowY > halfH - 2) return null;
                             return (
                                 <group key={`window-${i}`} position={[0, windowY, d/2 + 0.01]}>
                                     <mesh material={detailMat}>
                                         <boxGeometry args={[w*0.6, 0.8, 0.06]} />
                                     </mesh>
                                     <mesh position={[0, 0, 0.03]}>
                                         <boxGeometry args={[w*0.55, 0.7, 0.02]} />
                                         <meshStandardMaterial 
                                             color={isNight ? "#ffaa00" : "#4a5568"} 
                                             emissive={isNight ? "#ffaa00" : "#000000"}
                                             emissiveIntensity={isNight ? 0.6 : 0}
                                             transparent
                                             opacity={0.6}
                                         />
                                     </mesh>
                                 </group>
                             );
                         })}
                         
                         {/* Loading Bay Door - Simplified */}
                         <group position={[0, -halfH + 1.5, d/2 + 0.01]}>
                             <mesh castShadow material={detailMat}>
                                 <boxGeometry args={[w*0.6, 2.5, 0.1]} />
                             </mesh>
                             <mesh position={[0, 0, 0.05]}>
                                 <boxGeometry args={[w*0.55, 2.4, 0.02]} />
                                 <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
                             </mesh>
                         </group>
                         
                         {/* Smokestack - Simplified */}
                         {arch.hasVents && (
                             <group position={[w*0.3, halfH + 0.5, 0]}>
                                 <mesh castShadow material={detailMat}>
                                     <cylinderGeometry args={[0.7, 0.7, 4, 12]} />
                                 </mesh>
                                 <mesh position={[0, 2.5, 0]} castShadow material={detailMat}>
                                     <cylinderGeometry args={[0.75, 0.7, 0.3, 12]} />
                                 </mesh>
                             </group>
                         )}
                         
                         {/* Roof */}
                         <mesh position={[0, halfH+0.1, 0]} castShadow receiveShadow material={roofMat}>
                             <boxGeometry args={[w, 0.3, d]} />
                         </mesh>
                    </>
                 )
            default:
                return (
                    <>
                        <mesh position={[0, 0, 0]} castShadow receiveShadow material={mainMat}>
                            <boxGeometry args={[w, h, d]} />
                        </mesh>
                        {renderRoofProps()}
                    </>
                );
        }
    }

    // Building Y position: entity.pos.y is already set to half height in worldGen
    // This ensures the building center is at half height, so bottom touches ground
    const buildingY = entity.pos.y;
    
    return (
        <group 
            ref={groupRef} 
            position={[entity.pos.x, buildingY, entity.pos.z]}
            rotation={[0, 0, 0]} // Ensure buildings are upright
        >
            {renderArchitecture()}
        </group>
    );
};

export default Building;
