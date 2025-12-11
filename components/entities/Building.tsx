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

    // Reusable Materials
    const mainMat = useMemo(() => (
        <meshStandardMaterial 
            map={arch.texSet.map}
            normalMap={arch.texSet.normalMap}
            roughnessMap={arch.texSet.roughnessMap}
            emissiveMap={arch.texSet.emissiveMap}
            emissive="#ffffff"
            emissiveIntensity={isNight ? 2.5 : 0} 
            color={arch.baseColor} 
        />
    ), [arch, isNight]);

    const roofMat = useMemo(() => <meshStandardMaterial color="#262626" roughness={0.9} />, []);
    const detailMat = useMemo(() => <meshStandardMaterial color="#4b5563" roughness={0.7} />, []);

    useFrame(() => {
        if (!groupRef.current) return;
        const pPos = stateRef.current.player.pos;
        const distSq = (entity.pos.x - pPos.x)**2 + (entity.pos.z - pPos.z)**2;
        groupRef.current.visible = distSq < CULL_DISTANCE ** 2;
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
                        {/* Tapered Design */}
                        <mesh position={[0, -h*0.1, 0]} castShadow receiveShadow material={mainMat}>
                            <boxGeometry args={[w, h*0.8, d]} />
                        </mesh>
                        <mesh position={[0, h*0.35, 0]} castShadow receiveShadow material={mainMat}>
                            <boxGeometry args={[w*0.7, h*0.3, d*0.7]} />
                        </mesh>
                        {/* Roof */}
                        <mesh position={[0, halfH + 0.1, 0]} material={roofMat}>
                             <boxGeometry args={[w*0.65, 0.2, d*0.65]} />
                        </mesh>
                        {/* Antenna */}
                        <mesh position={[0, halfH + 3, 0]} material={detailMat}>
                             <cylinderGeometry args={[0.1, 0.3, 6]} />
                        </mesh>
                        {isNight && <pointLight position={[0, halfH + 6, 0]} color="red" distance={20} intensity={2} />}
                    </>
                );
            case 'residential':
                return (
                    <>
                        <mesh position={[0, 0, 0]} castShadow receiveShadow material={mainMat}>
                             <boxGeometry args={[w, h, d]} />
                        </mesh>
                        {/* Parapet */}
                        <mesh position={[0, halfH + 0.2, 0]} material={roofMat}>
                             <boxGeometry args={[w+0.2, 0.4, d+0.2]} />
                        </mesh>
                        {/* Balconies */}
                        {Array.from({ length: Math.floor(h/3) }).map((_, i) => (
                            <group key={i} position={[0, -halfH + 2 + (i*3), d/2 + 0.25]}>
                                <mesh castShadow material={detailMat}>
                                    <boxGeometry args={[w*0.6, 0.1, 0.5]} />
                                </mesh>
                                <mesh position={[0, 0.4, 0.23]} material={detailMat}>
                                     <boxGeometry args={[w*0.6, 0.8, 0.05]} />
                                </mesh>
                            </group>
                        ))}
                        {renderRoofProps()}
                    </>
                );
            case 'commercial':
                return (
                    <>
                        <mesh position={[0, 0, 0]} castShadow receiveShadow material={mainMat}>
                             <boxGeometry args={[w, h, d]} />
                        </mesh>
                        {/* Awning */}
                        <group position={[0, -halfH + 1.5, d/2 + 0.5]}>
                             <mesh rotation={[0.2, 0, 0]} castShadow>
                                 <boxGeometry args={[w*0.9, 0.1, 1.2]} />
                                 <meshStandardMaterial color={arch.baseColor} />
                             </mesh>
                        </group>
                        {/* Signage */}
                        <mesh position={[0, halfH - 1, d/2 + 0.1]}>
                             <boxGeometry args={[w*0.8, 1, 0.1]} />
                             <meshStandardMaterial color="#111" />
                        </mesh>
                        {renderRoofProps()}
                    </>
                );
            case 'industrial':
                 return (
                    <>
                         <mesh position={[0, 0, 0]} castShadow receiveShadow material={mainMat}>
                             <boxGeometry args={[w, h, d]} />
                         </mesh>
                         {/* Smokestack */}
                         <mesh position={[w*0.25, halfH + 2, 0]} castShadow material={detailMat}>
                             <cylinderGeometry args={[0.6, 0.6, 4, 16]} />
                         </mesh>
                         <mesh position={[0, halfH+0.1, 0]} material={roofMat}>
                             <boxGeometry args={[w, 0.2, d]} />
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

    return (
        <group ref={groupRef} position={[entity.pos.x, entity.pos.y, entity.pos.z]}>
            {renderArchitecture()}
        </group>
    );
};

export default Building;
