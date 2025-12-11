import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Entity } from '../../types';

interface ProjectileProps {
    entity: Entity;
}

const Projectile: React.FC<ProjectileProps> = ({ entity }) => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        // Linear Interpolation for smoothness
        meshRef.current.position.lerp(new THREE.Vector3(entity.pos.x, entity.pos.y, entity.pos.z), 30 * delta);
        
        // Orient towards velocity
        if (Math.abs(entity.vel.x) > 0.01 || Math.abs(entity.vel.z) > 0.01) {
             const angle = Math.atan2(entity.vel.x, entity.vel.z);
             meshRef.current.rotation.y = angle;
        }
    });

    return (
        <mesh ref={meshRef} position={[entity.pos.x, entity.pos.y, entity.pos.z]}>
            <boxGeometry args={[0.1, 0.1, 0.8]} />
            <meshBasicMaterial color="#facc15" />
            <pointLight distance={3} intensity={2} color="#facc15" decay={2} />
        </mesh>
    );
};

export default Projectile;