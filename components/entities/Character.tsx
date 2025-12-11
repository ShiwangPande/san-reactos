import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Entity, GameState, WeaponType } from '../../types';

const CULL_DISTANCE = 150;

interface CharacterProps {
    entity: Entity;
    isPlayer?: boolean;
    stateRef: React.MutableRefObject<GameState>;
}

const Character: React.FC<CharacterProps> = ({ entity, isPlayer, stateRef }) => {
    // --- RIG HIERARCHY ---
    const rootRef = useRef<THREE.Group>(null);
    const hipsRef = useRef<THREE.Group>(null);
    const spineRef = useRef<THREE.Group>(null);
    const chestRef = useRef<THREE.Group>(null);
    const headGroupRef = useRef<THREE.Group>(null);

    // Limbs
    const lThighRef = useRef<THREE.Group>(null);
    const lShinRef = useRef<THREE.Group>(null);
    const lFootRef = useRef<THREE.Group>(null);
    
    const rThighRef = useRef<THREE.Group>(null);
    const rShinRef = useRef<THREE.Group>(null);
    const rFootRef = useRef<THREE.Group>(null);

    const lArmRef = useRef<THREE.Group>(null);
    const lForearmRef = useRef<THREE.Group>(null);
    const lHandRef = useRef<THREE.Group>(null);

    const rArmRef = useRef<THREE.Group>(null);
    const rForearmRef = useRef<THREE.Group>(null);
    const rHandRef = useRef<THREE.Group>(null);

    // --- MATERIALS ---
    const materials = useMemo(() => {
        // GTA-style colors - more vibrant and distinct
        const shirtColor = new THREE.Color(isPlayer ? "#1e40af" : entity.color); // Deeper blue for player
        const pantsColor = new THREE.Color("#1e293b"); // Darker jeans (GTA style)
        const skinColor = new THREE.Color("#d4a574"); // Slightly lighter, more GTA-like skin tone
        
        // Material Helper
        // flatShading: false creates the "smooth low poly" look (PS2/GTA era)
        // flatShading: true creates the "faceted/paper" look (modern indie low poly)
        const mat = (col: THREE.Color | string, rough: number = 0.8, smooth: boolean = true) => 
            new THREE.MeshStandardMaterial({ 
                color: col, 
                roughness: rough, 
                flatShading: !smooth 
            });

        return {
            skin: mat(skinColor, 0.6, true), // Smooth skin with slight shine
            shirt: mat(shirtColor, 0.75, true), // More polished fabric
            pants: mat(pantsColor, 0.85, true), // Denim texture
            shoes: mat("#050505", 0.4, false), // Very black, glossy shoes
            sole: mat("#1a1a1a", 0.9, false), // Dark rubber sole
            hair: mat("#0a0a0a", 0.7, false), // Deep black hair with slight shine
            eyesWhite: mat("#ffffff", 0.05, false), // Bright white eyes
            eyesPupil: mat("#000000", 0.0, false), // Pure black pupils
            lips: mat(skinColor.clone().multiplyScalar(0.88), 0.5, true), // Subtle lip color
            weapon: mat("#1a1a1a", 0.2, false), // Very dark, metallic weapon
            accessory: mat("#f59e0b", 0.5, false) // Vibrant gold accessory
        };
    }, [entity.color, isPlayer]);

    // --- ANIMATION ---
    useFrame((state, delta) => {
        if (!rootRef.current) return;

        // 1. Culling (only for NPCs, player is always visible)
        if (!isPlayer) {
            const pPos = stateRef.current.player.pos;
            const distSq = (entity.pos.x - pPos.x)**2 + (entity.pos.z - pPos.z)**2;
            const visible = distSq < CULL_DISTANCE ** 2;
            rootRef.current.visible = visible;
            if (!visible) return;
        } else {
            // Ensure player is always visible
            rootRef.current.visible = true;
        }

        // 2. Movement Smoothing - Character root positioned at entity.pos
        // Entity.pos.y is the ground level for the character root
        const targetPos = new THREE.Vector3(entity.pos.x, entity.pos.y, entity.pos.z);
        rootRef.current.position.lerp(targetPos, 20 * delta);

        // Rotation Smoothing (Shortest path)
        let rotDiff = entity.rotation.y - rootRef.current.rotation.y;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        rootRef.current.rotation.y += rotDiff * 15 * delta;

        // 3. Procedural Animation Rig
        const speed = Math.sqrt(entity.vel.x**2 + entity.vel.z**2);
        const isMoving = speed > 0.1;
        const isPunching = entity.state === 'punching';

        // Animation Time Bases
        const t = state.clock.elapsedTime;
        const walkCycle = t * 11;       // Fast frequency for running
        const breathCycle = t * 2.5;    // Slow frequency for idle breathing
        const punchTime = isPunching ? (t % 0.3) : 0; // 0.3 second punch animation

        // -- Spine / Breathing --
        if (hipsRef.current && spineRef.current && chestRef.current) {
            if (isMoving) {
                // Run/Walk: Active bouncy movement
                const bounce = Math.abs(Math.sin(walkCycle)) * 0.06;
                hipsRef.current.position.y = 0.94 + bounce;
                
                // Counter-rotation for torque
                const twist = Math.sin(walkCycle) * 0.15;
                hipsRef.current.rotation.y = twist * 0.5;
                spineRef.current.rotation.y = -twist * 0.3;
                chestRef.current.rotation.y = -twist * 0.4; // Chest compensates to face forward
                chestRef.current.rotation.x = 0.05; // Lean forward slightly when running
            } else {
                // Idle: Subtle breathing and weight shift
                const breathe = Math.sin(breathCycle);
                
                // Slight hip sway/bob
                hipsRef.current.position.y = 0.94 + breathe * 0.005;
                hipsRef.current.rotation.y = Math.sin(breathCycle * 0.5) * 0.02; 
                spineRef.current.rotation.y = Math.sin(breathCycle * 0.5 + 1) * 0.01;

                // Chest expanding (heaving)
                chestRef.current.rotation.x = breathe * 0.03;
                chestRef.current.rotation.y = 0;
            }
        }

        // -- Legs --
        const stride = 0.8;
        if (lThighRef.current && lShinRef.current && lFootRef.current) {
            if (isMoving) {
                const phase = walkCycle;
                lThighRef.current.rotation.x = Math.sin(phase) * stride;
                const kneeFlex = Math.max(0, -Math.sin(phase + 0.5) * 1.5);
                lShinRef.current.rotation.x = -kneeFlex;
                lFootRef.current.rotation.x = Math.max(0, Math.sin(phase + 1) * 0.5);
            } else {
                // Return to standing
                lThighRef.current.rotation.x = THREE.MathUtils.lerp(lThighRef.current.rotation.x, 0, delta * 10);
                lShinRef.current.rotation.x = THREE.MathUtils.lerp(lShinRef.current.rotation.x, 0, delta * 10);
                lFootRef.current.rotation.x = THREE.MathUtils.lerp(lFootRef.current.rotation.x, 0, delta * 10);
            }
        }
        if (rThighRef.current && rShinRef.current && rFootRef.current) {
            if (isMoving) {
                const phase = walkCycle + Math.PI;
                rThighRef.current.rotation.x = Math.sin(phase) * stride;
                const kneeFlex = Math.max(0, -Math.sin(phase + 0.5) * 1.5);
                rShinRef.current.rotation.x = -kneeFlex;
                rFootRef.current.rotation.x = Math.max(0, Math.sin(phase + 1) * 0.5);
            } else {
                rThighRef.current.rotation.x = THREE.MathUtils.lerp(rThighRef.current.rotation.x, 0, delta * 10);
                rShinRef.current.rotation.x = THREE.MathUtils.lerp(rShinRef.current.rotation.x, 0, delta * 10);
                rFootRef.current.rotation.x = THREE.MathUtils.lerp(rFootRef.current.rotation.x, 0, delta * 10);
            }
        }

        // -- Arms --
        const hasWeapon = entity.inventory && entity.inventory[0] !== WeaponType.FIST;

        if (lArmRef.current && lForearmRef.current) {
            if (isMoving) {
                const phase = walkCycle + Math.PI;
                lArmRef.current.rotation.x = Math.sin(phase) * 0.6;
                lArmRef.current.rotation.z = 0.1;
                lForearmRef.current.rotation.x = -0.15 - Math.abs(Math.sin(phase)) * 0.4;
            } else {
                // Idle Sway (Breathing influences arms)
                const breathe = Math.sin(breathCycle);
                lArmRef.current.rotation.x = THREE.MathUtils.lerp(lArmRef.current.rotation.x, breathe * 0.02, delta * 5);
                // Arms move slightly out when breathing in
                lArmRef.current.rotation.z = 0.1 + breathe * 0.01; 
                lForearmRef.current.rotation.x = THREE.MathUtils.lerp(lForearmRef.current.rotation.x, -0.1, delta * 5);
            }
        }

        if (rArmRef.current && rForearmRef.current && rHandRef.current) {
            if (isPunching) {
                // Punch Animation: Quick forward punch
                const punchProgress = Math.min(punchTime / 0.15, 1); // 0 to 1 over 0.15s
                const punchEase = punchProgress < 0.5 
                    ? punchProgress * 2  // Fast forward
                    : 1 - ((punchProgress - 0.5) * 2); // Slow return
                
                rArmRef.current.rotation.x = -0.3 - (punchEase * 1.2); // Extend forward
                rArmRef.current.rotation.z = -0.2 - (punchEase * 0.3); // Slight outward
                rForearmRef.current.rotation.x = -0.2 - (punchEase * 0.5);
                rHandRef.current.rotation.x = punchEase * 0.3; // Fist clench
            } else if (hasWeapon) {
                // Aim Pose - Add subtle breath noise
                const breathNoise = Math.sin(breathCycle) * 0.005;
                rArmRef.current.rotation.x = -Math.PI / 2 + Math.sin(t * 2) * 0.01 + breathNoise;
                rArmRef.current.rotation.z = 0;
                rForearmRef.current.rotation.x = -0.1;
                rHandRef.current.rotation.x = 0;
            } else {
                if (isMoving) {
                    const phase = walkCycle;
                    rArmRef.current.rotation.x = Math.sin(phase) * 0.6;
                    rArmRef.current.rotation.z = -0.1;
                    rForearmRef.current.rotation.x = -0.15 - Math.abs(Math.sin(phase)) * 0.4;
                } else {
                    // Idle Sway
                    const breathe = Math.sin(breathCycle);
                    rArmRef.current.rotation.x = THREE.MathUtils.lerp(rArmRef.current.rotation.x, breathe * 0.02, delta * 5);
                    rArmRef.current.rotation.z = -0.1 - breathe * 0.01;
                    rForearmRef.current.rotation.x = THREE.MathUtils.lerp(rForearmRef.current.rotation.x, -0.1, delta * 5);
                }
            }
        }
        
        // Left arm also participates in punch (slight pull back)
        if (lArmRef.current && isPunching) {
            const punchProgress = Math.min(punchTime / 0.15, 1);
            const punchEase = punchProgress < 0.5 ? punchProgress * 2 : 1 - ((punchProgress - 0.5) * 2);
            lArmRef.current.rotation.x = 0.1 + (punchEase * 0.3); // Pull back slightly
            lArmRef.current.rotation.z = 0.1;
        }

        // -- Head (Look & Stabilization) --
        if (headGroupRef.current) {
            // Idle random look or horizon stabilizer
             headGroupRef.current.rotation.y = Math.sin(breathCycle * 0.5) * 0.05;
             headGroupRef.current.rotation.x = Math.cos(breathCycle) * 0.01;
        }
    });

    const GEOM_RES = 12; // Increased segments for smoother, more polished look

    return (
        <group ref={rootRef} visible={true}>
            {/* --- RIG START: HIPS (Pelvis) --- */}
            <group ref={hipsRef} position={[0, 0.94, 0]}>
                {/* Hips Mesh */}
                <mesh position={[0, 0.02, 0]} castShadow material={materials.pants}>
                    <cylinderGeometry args={[0.13, 0.135, 0.22, GEOM_RES]} />
                </mesh>

                {/* --- LEGS --- */}
                {/* Left Leg */}
                <group ref={lThighRef} position={[-0.1, -0.05, 0]}>
                    <mesh position={[0, -0.21, 0]} castShadow material={materials.pants}>
                        <cylinderGeometry args={[0.095, 0.075, 0.45, GEOM_RES]} /> {/* Tapered Thigh */}
                    </mesh>
                    <group ref={lShinRef} position={[0, -0.44, 0]}>
                        <mesh position={[0, -0.2, 0]} castShadow material={materials.pants}>
                            <cylinderGeometry args={[0.07, 0.055, 0.42, GEOM_RES]} /> {/* Calf Muscle Taper */}
                        </mesh>
                        <group ref={lFootRef} position={[0, -0.4, 0.03]}>
                            <mesh castShadow material={materials.shoes}>
                                <boxGeometry args={[0.09, 0.1, 0.24]} />
                            </mesh>
                            {/* Toe Slope */}
                            <mesh position={[0, -0.015, 0.08]} rotation={[0.2,0,0]} material={materials.shoes}>
                                 <boxGeometry args={[0.09, 0.06, 0.1]} />
                            </mesh>
                             <mesh position={[0, -0.045, 0]} material={materials.sole}>
                                <boxGeometry args={[0.095, 0.02, 0.25]} />
                            </mesh>
                        </group>
                    </group>
                </group>

                {/* Right Leg */}
                <group ref={rThighRef} position={[0.1, -0.05, 0]}>
                    <mesh position={[0, -0.21, 0]} castShadow material={materials.pants}>
                        <cylinderGeometry args={[0.095, 0.075, 0.45, GEOM_RES]} />
                    </mesh>
                    <group ref={rShinRef} position={[0, -0.44, 0]}>
                        <mesh position={[0, -0.2, 0]} castShadow material={materials.pants}>
                            <cylinderGeometry args={[0.07, 0.055, 0.42, GEOM_RES]} />
                        </mesh>
                        <group ref={rFootRef} position={[0, -0.4, 0.03]}>
                            <mesh castShadow material={materials.shoes}>
                                <boxGeometry args={[0.09, 0.1, 0.24]} />
                            </mesh>
                            <mesh position={[0, -0.015, 0.08]} rotation={[0.2,0,0]} material={materials.shoes}>
                                 <boxGeometry args={[0.09, 0.06, 0.1]} />
                            </mesh>
                             <mesh position={[0, -0.045, 0]} material={materials.sole}>
                                <boxGeometry args={[0.095, 0.02, 0.25]} />
                            </mesh>
                        </group>
                    </group>
                </group>

                {/* --- SPINE (Abdomen) --- */}
                <group ref={spineRef} position={[0, 0.11, 0]}>
                    {/* Stomach Area (Waist Taper) */}
                    <mesh position={[0, 0.1, 0]} castShadow material={materials.shirt}>
                        <cylinderGeometry args={[0.135, 0.13, 0.24, GEOM_RES]} />
                    </mesh>
                    
                    {/* --- CHEST (Torso) --- */}
                    <group ref={chestRef} position={[0, 0.24, 0]}>
                         {/* Upper Torso - More GTA-like proportions */}
                         <mesh position={[0, 0.14, 0]} castShadow material={materials.shirt}>
                             {/* Broader shoulders for GTA look */}
                             <cylinderGeometry args={[0.20, 0.15, 0.34, GEOM_RES]} />
                         </mesh>
                         {/* Pectoral Definition - More pronounced */}
                         <mesh position={[0, 0.16, 0.09]} rotation={[-0.1,0,0]} material={materials.shirt}>
                              <boxGeometry args={[0.28, 0.16, 0.12]} />
                         </mesh>
                         {/* Shoulder pads effect */}
                         <mesh position={[-0.22, 0.20, 0]} castShadow material={materials.shirt}>
                              <boxGeometry args={[0.06, 0.08, 0.12]} />
                         </mesh>
                         <mesh position={[0.22, 0.20, 0]} castShadow material={materials.shirt}>
                              <boxGeometry args={[0.06, 0.08, 0.12]} />
                         </mesh>

                         {/* --- HEAD GROUP --- */}
                         <group ref={headGroupRef} position={[0, 0.32, 0]}>
                             {/* Neck */}
                             <mesh position={[0, 0.04, 0]} material={materials.skin}>
                                 <cylinderGeometry args={[0.055, 0.065, 0.12, 8]} />
                             </mesh>
                             
                             {/* Head Container - GTA style proportions */}
                             <group position={[0, 0.18, 0.02]}>
                                 {/* Cranium - Slightly larger for GTA look */}
                                 <mesh position={[0, 0.02, -0.02]} castShadow receiveShadow material={materials.skin}>
                                     <boxGeometry args={[0.20, 0.21, 0.23]} />
                                 </mesh>
                                 {/* Jawline / Chin - More defined */}
                                 <mesh position={[0, -0.09, 0.02]} castShadow receiveShadow material={materials.skin}>
                                     <boxGeometry args={[0.18, 0.09, 0.19]} />
                                 </mesh>
                                 {/* Cheekbones - GTA style definition (subtle) */}
                                 <mesh position={[-0.08, -0.02, 0.05]} castShadow material={materials.skin}>
                                     <boxGeometry args={[0.025, 0.05, 0.03]} />
                                 </mesh>
                                 <mesh position={[0.08, -0.02, 0.05]} castShadow material={materials.skin}>
                                     <boxGeometry args={[0.025, 0.05, 0.03]} />
                                 </mesh>
                                 {/* Neck muscles - More defined for GTA look */}
                                 <mesh position={[-0.06, -0.15, 0]} castShadow material={materials.skin}>
                                     <boxGeometry args={[0.02, 0.08, 0.04]} />
                                 </mesh>
                                 <mesh position={[0.06, -0.15, 0]} castShadow material={materials.skin}>
                                     <boxGeometry args={[0.02, 0.08, 0.04]} />
                                 </mesh>
                                 {/* Hair (Short Fade Cut) */}
                                 <mesh position={[0, 0.06, -0.01]} castShadow material={materials.hair}>
                                     <boxGeometry args={[0.20, 0.14, 0.23]} />
                                 </mesh>
                                 <mesh position={[0, 0.13, -0.01]} material={materials.hair}>
                                      <boxGeometry args={[0.16, 0.05, 0.2]} />
                                 </mesh>

                                 {/* Face Features */}
                                 <group position={[0, 0, 0.115]}>
                                      {/* Nose (Geometric Bridge) */}
                                      <mesh position={[0, 0, 0]} rotation={[0.2,0,0]} castShadow material={materials.skin}>
                                          <boxGeometry args={[0.035, 0.07, 0.06]} />
                                      </mesh>
                                      {/* Lips */}
                                      <mesh position={[0, -0.06, -0.01]} material={materials.lips}>
                                           <boxGeometry args={[0.06, 0.015, 0.02]} />
                                      </mesh>
                                      {/* Brows */}
                                      <mesh position={[0, 0.045, 0.01]} material={materials.hair}>
                                          <boxGeometry args={[0.16, 0.015, 0.02]} />
                                      </mesh>
                                      
                                      {/* Eyes (Left) */}
                                      <mesh position={[-0.04, 0.015, 0]} material={materials.eyesWhite}>
                                          <planeGeometry args={[0.04, 0.02]} />
                                      </mesh>
                                      <mesh position={[-0.04, 0.015, 0.002]} material={materials.eyesPupil}>
                                          <planeGeometry args={[0.015, 0.015]} />
                                      </mesh>
                                      {/* Eyelid L (Half closed for 'serious' look) */}
                                      <mesh position={[-0.04, 0.025, 0.003]} material={materials.skin} rotation={[0,0,-0.1]}>
                                          <planeGeometry args={[0.045, 0.01]} />
                                      </mesh>

                                      {/* Eyes (Right) */}
                                      <mesh position={[0.04, 0.015, 0]} material={materials.eyesWhite}>
                                          <planeGeometry args={[0.04, 0.02]} />
                                      </mesh>
                                      <mesh position={[0.04, 0.015, 0.002]} material={materials.eyesPupil}>
                                          <planeGeometry args={[0.015, 0.015]} />
                                      </mesh>
                                      {/* Eyelid R */}
                                      <mesh position={[0.04, 0.025, 0.003]} material={materials.skin} rotation={[0,0,0.1]}>
                                          <planeGeometry args={[0.045, 0.01]} />
                                      </mesh>
                                 </group>

                                 {/* Accessory: Bandana */}
                                 {entity.accessory === 'bandana' && (
                                     <mesh position={[0, -0.06, 0.05]} rotation={[0.2,0,0]} material={materials.accessory}>
                                         <boxGeometry args={[0.2, 0.12, 0.12]} />
                                     </mesh>
                                 )}
                             </group>
                         </group>

                         {/* --- ARMS --- */}
                         {/* Left Arm (Integrated Shoulder) */}
                         <group ref={lArmRef} position={[-0.2, 0.22, 0]}>
                             {/* Deltoid/Upper Arm */}
                             <mesh position={[0, -0.14, 0]} castShadow material={materials.skin}>
                                 <cylinderGeometry args={[0.07, 0.055, 0.32, GEOM_RES]} />
                             </mesh>
                             {/* Sleeve Cap */}
                             <mesh position={[0, -0.06, 0]} castShadow material={materials.shirt}>
                                  <cylinderGeometry args={[0.075, 0.07, 0.18, GEOM_RES]} />
                             </mesh>
                             
                             <group ref={lForearmRef} position={[0, -0.3, 0]}>
                                  {/* Forearm */}
                                  <mesh position={[0, -0.14, 0]} castShadow material={materials.skin}>
                                       <cylinderGeometry args={[0.05, 0.04, 0.28, GEOM_RES]} />
                                  </mesh>
                                  {/* Hand L (Constructed) */}
                                  <group ref={lHandRef} position={[0, -0.3, 0]}>
                                      <mesh position={[0, -0.05, 0]} material={materials.skin}>
                                          <boxGeometry args={[0.05, 0.09, 0.07]} /> {/* Palm */}
                                      </mesh>
                                      <mesh position={[0.03, -0.04, 0.04]} rotation={[0.5, 0, -0.5]} material={materials.skin}>
                                          <boxGeometry args={[0.025, 0.06, 0.025]} /> {/* Thumb */}
                                      </mesh>
                                      <mesh position={[0, -0.11, 0.01]} material={materials.skin}>
                                           <boxGeometry args={[0.05, 0.06, 0.06]} /> {/* Fingers Block */}
                                      </mesh>
                                  </group>
                             </group>
                         </group>

                         {/* Right Arm */}
                         <group ref={rArmRef} position={[0.2, 0.22, 0]}>
                             <mesh position={[0, -0.14, 0]} castShadow material={materials.skin}>
                                 <cylinderGeometry args={[0.07, 0.055, 0.32, GEOM_RES]} />
                             </mesh>
                             <mesh position={[0, -0.06, 0]} castShadow material={materials.shirt}>
                                  <cylinderGeometry args={[0.075, 0.07, 0.18, GEOM_RES]} />
                             </mesh>
                             
                             <group ref={rForearmRef} position={[0, -0.3, 0]}>
                                  <mesh position={[0, -0.14, 0]} castShadow material={materials.skin}>
                                       <cylinderGeometry args={[0.05, 0.04, 0.28, GEOM_RES]} />
                                  </mesh>
                                  {/* Hand R */}
                                  <group ref={rHandRef} position={[0, -0.3, 0]}>
                                      <mesh position={[0, -0.05, 0]} material={materials.skin}>
                                          <boxGeometry args={[0.05, 0.09, 0.07]} />
                                      </mesh>
                                      <mesh position={[-0.03, -0.04, 0.04]} rotation={[0.5, 0, 0.5]} material={materials.skin}>
                                          <boxGeometry args={[0.025, 0.06, 0.025]} />
                                      </mesh>
                                      <mesh position={[0, -0.11, 0.01]} material={materials.skin}>
                                           <boxGeometry args={[0.05, 0.06, 0.06]} />
                                      </mesh>

                                      {/* WEAPON ATTACHMENT */}
                                      {entity.inventory && entity.inventory[0] !== WeaponType.FIST && (
                                         <group position={[0, -0.06, 0.04]} rotation={[Math.PI/2, 0, 0]}>
                                             {entity.inventory[0] === WeaponType.PISTOL ? (
                                                  <group>
                                                      <mesh position={[0, 0.04, 0]} material={materials.weapon} castShadow>
                                                          <boxGeometry args={[0.04, 0.16, 0.04]} />
                                                      </mesh>
                                                      <mesh position={[0, 0.08, 0.05]} material={materials.weapon} castShadow>
                                                          <boxGeometry args={[0.04, 0.04, 0.14]} />
                                                      </mesh>
                                                  </group>
                                             ) : (
                                                  <group>
                                                      <mesh position={[0, 0.02, -0.1]} material={materials.weapon} castShadow>
                                                          <boxGeometry args={[0.05, 0.25, 0.06]} />
                                                      </mesh>
                                                      <mesh position={[0, 0.1, 0.1]} material={materials.weapon} castShadow>
                                                          <boxGeometry args={[0.06, 0.06, 0.35]} />
                                                      </mesh>
                                                  </group>
                                             )}
                                         </group>
                                     )}
                                  </group>
                             </group>
                         </group>

                    </group>
                </group>

            </group>
        </group>
    );
};

export default Character;