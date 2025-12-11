import React, { useRef, useMemo, useLayoutEffect, memo } from 'react';
import * as THREE from 'three';
import { GameMap, TileType } from '../../types';
import { TILE_SIZE, WORLD_COLORS } from '../../constants';
import { useRoadTextures, useSidewalkTexture, useNatureTexture } from '../../hooks/useProceduralTextures';

interface CityMapProps {
    map: GameMap;
}

const CityMap = memo(({ map }: CityMapProps) => {
    const roadRef = useRef<THREE.InstancedMesh>(null);
    const sidewalkRef = useRef<THREE.InstancedMesh>(null);
    const natureRef = useRef<THREE.InstancedMesh>(null);
    const waterRef = useRef<THREE.InstancedMesh>(null);
    const mountainRef = useRef<THREE.InstancedMesh>(null);
    const clutterRef = useRef<THREE.InstancedMesh>(null); // For rocks/bushes

    // Load Textures
    const roadTextures = useRoadTextures();
    const sidewalkTexture = useSidewalkTexture();
    const natureTextures = useNatureTexture();

    const { 
        roadMatrices, 
        sidewalkMatrices, sidewalkColors,
        natureMatrices, natureColors,
        waterMatrices, 
        mountainMatrices,
        clutterMatrices, clutterColors
    } = useMemo(() => {
        const rMat: THREE.Matrix4[] = [];
        
        const sMat: THREE.Matrix4[] = [];
        const sCol: number[] = [];
        
        const nMat: THREE.Matrix4[] = [];
        const nCol: number[] = [];
        
        const wMat: THREE.Matrix4[] = [];
        const mMat: THREE.Matrix4[] = [];

        const cMat: THREE.Matrix4[] = []; // Clutter
        const cCol: number[] = [];

        const dummy = new THREE.Object3D();

        map.tiles.forEach((row, z) => row.forEach((tile, x) => {
            dummy.position.set(x * TILE_SIZE, 0, z * TILE_SIZE);
            dummy.rotation.set(-Math.PI/2, 0, 0);
            dummy.scale.set(1, 1, 1);
            
            if (tile === TileType.ROAD) {
                dummy.position.y = 0.05; 
                dummy.updateMatrix();
                rMat.push(dummy.matrix.clone());
            } else if (tile === TileType.WATER) {
                dummy.position.y = -0.2;
                dummy.updateMatrix();
                wMat.push(dummy.matrix.clone());
            } else if (tile === TileType.SIDEWALK || tile === TileType.FLOOR) {
                // Raise sidewalk to create CURB (0.2 height vs Road 0.05)
                dummy.position.y = 0.2;
                dummy.updateMatrix();
                sMat.push(dummy.matrix.clone());
                sCol.push(Number(new THREE.Color(WORLD_COLORS[tile]).getHex()));
            } else if (tile === TileType.MOUNTAIN) {
                const h = map.elevations[z][x];
                dummy.position.set(x * TILE_SIZE, h/2, z * TILE_SIZE);
                dummy.rotation.set(0,0,0);
                dummy.scale.set(TILE_SIZE, h, TILE_SIZE);
                dummy.updateMatrix();
                mMat.push(dummy.matrix.clone());
            } else {
                // Grass, Sand (Nature)
                dummy.updateMatrix();
                nMat.push(dummy.matrix.clone());
                
                // Color Variation (Break repetition)
                const baseColor = new THREE.Color(WORLD_COLORS[tile]);
                const hsl = { h: 0, s: 0, l: 0 };
                baseColor.getHSL(hsl);
                // Subtle random shift
                baseColor.setHSL(
                    hsl.h + (Math.random() - 0.5) * 0.06, 
                    hsl.s, 
                    hsl.l + (Math.random() - 0.5) * 0.1
                );
                nCol.push(baseColor.getHex());

                // SCATTER CLUTTER (Only on Grass)
                if (tile === TileType.GRASS && Math.random() > 0.6) {
                    const clutterCount = Math.floor(Math.random() * 3) + 1;
                    for(let k=0; k<clutterCount; k++) {
                        // Random offset within tile
                        const cx = (x * TILE_SIZE) + (Math.random() - 0.5) * TILE_SIZE * 0.8;
                        const cz = (z * TILE_SIZE) + (Math.random() - 0.5) * TILE_SIZE * 0.8;
                        
                        // Scale variation
                        const scale = 0.2 + Math.random() * 0.4;
                        
                        dummy.position.set(cx, scale * 0.4, cz);
                        dummy.rotation.set(Math.random() * 0.2, Math.random() * Math.PI, Math.random() * 0.2);
                        dummy.scale.set(scale, scale, scale);
                        dummy.updateMatrix();
                        
                        cMat.push(dummy.matrix.clone());
                        
                        // Random Clutter Color (Green Bush or Grey Rock)
                        const isBush = Math.random() > 0.4;
                        const clutterColor = isBush 
                             ? new THREE.Color("#166534").multiplyScalar(0.8 + Math.random() * 0.4) // Green
                             : new THREE.Color("#78716c").multiplyScalar(0.8 + Math.random() * 0.4); // Grey
                        
                        cCol.push(clutterColor.getHex());
                    }
                }
            }
        }));

        return { 
            roadMatrices: rMat, 
            sidewalkMatrices: sMat, sidewalkColors: sCol,
            natureMatrices: nMat, natureColors: nCol,
            waterMatrices: wMat,
            mountainMatrices: mMat,
            clutterMatrices: cMat, clutterColors: cCol
        };
    }, [map]);

    useLayoutEffect(() => {
        const updateMesh = (ref: React.RefObject<THREE.InstancedMesh>, matrices: THREE.Matrix4[], colors?: number[]) => {
            if (ref.current) {
                matrices.forEach((mat, i) => ref.current!.setMatrixAt(i, mat));
                if (colors) {
                    const c = new THREE.Color();
                    colors.forEach((col, i) => {
                        c.setHex(col);
                        ref.current!.setColorAt(i, c);
                    });
                    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
                }
                ref.current.instanceMatrix.needsUpdate = true;
            }
        };

        updateMesh(roadRef, roadMatrices);
        updateMesh(sidewalkRef, sidewalkMatrices, sidewalkColors);
        updateMesh(natureRef, natureMatrices, natureColors);
        updateMesh(waterRef, waterMatrices);
        updateMesh(mountainRef, mountainMatrices);
        updateMesh(clutterRef, clutterMatrices, clutterColors);

    }, [roadMatrices, sidewalkMatrices, natureMatrices, waterMatrices, mountainMatrices, clutterMatrices]);

    return (
        <group>
            {/* Global Base Plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[map.width * TILE_SIZE / 2, -3, map.height * TILE_SIZE / 2]} receiveShadow>
                 <planeGeometry args={[map.width * TILE_SIZE * 2, map.height * TILE_SIZE * 2]} />
                 <meshStandardMaterial color="#0f172a" roughness={1} />
            </mesh>

            {/* ROADS */}
            <instancedMesh ref={roadRef} args={[undefined, undefined, roadMatrices.length]} receiveShadow>
                <planeGeometry args={[TILE_SIZE, TILE_SIZE]} />
                <meshStandardMaterial 
                    map={roadTextures.map} 
                    roughnessMap={roadTextures.roughnessMap}
                    color="#ffffff" 
                    roughness={1} 
                    metalness={0.1} 
                />
            </instancedMesh>

            {/* SIDEWALKS */}
            <instancedMesh ref={sidewalkRef} args={[undefined, undefined, sidewalkMatrices.length]} receiveShadow>
                {/* Box Geometry for depth/curb effect */}
                <boxGeometry args={[TILE_SIZE, TILE_SIZE, 0.4]} /> 
                <meshStandardMaterial 
                    map={sidewalkTexture} 
                    roughness={0.8} 
                    metalness={0} 
                />
            </instancedMesh>

            {/* NATURE (Grass/Sand) */}
            <instancedMesh ref={natureRef} args={[undefined, undefined, natureMatrices.length]} receiveShadow>
                <planeGeometry args={[TILE_SIZE, TILE_SIZE]} />
                <meshStandardMaterial 
                    map={natureTextures.map} 
                    normalMap={natureTextures.normalMap}
                    roughness={1} 
                    metalness={0} 
                />
            </instancedMesh>

            {/* GROUND CLUTTER (Rocks/Bushes) */}
            <instancedMesh ref={clutterRef} args={[undefined, undefined, clutterMatrices.length]} castShadow receiveShadow>
                <dodecahedronGeometry args={[1, 0]} /> {/* Low poly rock shape */}
                <meshStandardMaterial roughness={0.9} />
            </instancedMesh>

            {/* WATER */}
            <instancedMesh ref={waterRef} args={[undefined, undefined, waterMatrices.length]}>
                <planeGeometry args={[TILE_SIZE, TILE_SIZE]} />
                <meshStandardMaterial 
                    color={WORLD_COLORS[TileType.WATER]} 
                    roughness={0.1} 
                    metalness={0.8} 
                    emissive={WORLD_COLORS[TileType.WATER]}
                    emissiveIntensity={0.2}
                />
            </instancedMesh>

            {/* MOUNTAINS */}
            <instancedMesh ref={mountainRef} args={[undefined, undefined, mountainMatrices.length]} castShadow receiveShadow>
                <boxGeometry args={[1, 1, 1]} /> 
                <meshStandardMaterial 
                    map={natureTextures.map}
                    color={WORLD_COLORS[TileType.MOUNTAIN]} 
                    roughness={1} 
                />
            </instancedMesh>
        </group>
    );
}, (prev, next) => prev.map === next.map);

export default CityMap;