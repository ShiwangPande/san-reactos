import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameState } from '../../types';

interface LightingProps {
    stateRef: React.MutableRefObject<GameState>;
    isNight: boolean;
}

const Lighting: React.FC<LightingProps> = ({ stateRef, isNight }) => {
    const { scene } = useThree();
    const dirLight = useRef<THREE.DirectionalLight>(null);
    const heroLight = useRef<THREE.SpotLight>(null);
    const fillLight = useRef<THREE.PointLight>(null);

    useEffect(() => {
        if (dirLight.current) scene.add(dirLight.current.target);
        if (heroLight.current) scene.add(heroLight.current.target);
        return () => { 
            if (dirLight.current) scene.remove(dirLight.current.target); 
            if (heroLight.current) scene.remove(heroLight.current.target);
        };
    }, [scene]);

    useFrame(() => {
        const s = stateRef.current;
        // Directional Sun/Moon
        if (dirLight.current) {
            const t = s.timeOfDay;
            const theta = (t / 1440) * Math.PI * 2 - Math.PI / 2;
            const sunDist = 100;
            const sunPos = new THREE.Vector3(Math.cos(theta) * sunDist, Math.sin(theta) * sunDist, -30);
            const p = s.player.pos;
            
            dirLight.current.position.set(p.x + sunPos.x, p.y + sunPos.y, p.z + sunPos.z);
            dirLight.current.target.position.set(p.x, p.y, p.z);
            dirLight.current.target.updateMatrixWorld();

            let intensity = 0;
            const color = new THREE.Color();
            
            // Improved day/night cycle with smooth transitions
            // Dawn: 5:00-7:00 (300-420), Day: 7:00-19:00 (420-1140), Dusk: 19:00-21:00 (1140-1260), Night: 21:00-5:00 (1260-300)
            
            if (t >= 420 && t < 1140) {
                // Full day (7:00 AM - 7:00 PM)
                intensity = 1.2;
                color.setHSL(0, 0, 1); // Pure white sunlight
            } else if (t >= 300 && t < 420) {
                // Dawn (5:00 AM - 7:00 AM) - Sunrise transition
                const dawnProgress = (t - 300) / 120; // 0 to 1 over 2 hours
                intensity = 0.3 + (dawnProgress * 0.9); // Fade in
                const hue = 0.05 + (dawnProgress * 0.05); // Orange to yellow
                color.setHSL(hue, 0.8 - (dawnProgress * 0.3), 0.5 + (dawnProgress * 0.3));
            } else if (t >= 1140 && t < 1260) {
                // Dusk (7:00 PM - 9:00 PM) - Sunset transition
                const duskProgress = (t - 1140) / 120; // 0 to 1 over 2 hours
                intensity = 1.2 - (duskProgress * 0.8); // Fade out
                const hue = 0.02 + (duskProgress * 0.08); // Yellow to orange/red
                color.setHSL(hue, 0.5 + (duskProgress * 0.3), 0.6 - (duskProgress * 0.2));
            } else {
                // Night (9:00 PM - 5:00 AM)
                intensity = 0.3;
                color.set("#60a5fa"); // Cool blue moonlight
            }
            
            dirLight.current.intensity = intensity * 2;
            dirLight.current.color.copy(color);
        }

        // Hero Lights
        const p = s.player.pos;
        if (heroLight.current) {
            heroLight.current.position.set(p.x - 5, p.y + 8, p.z - 5); 
            heroLight.current.target.position.set(p.x, p.y + 1, p.z);
            heroLight.current.target.updateMatrixWorld();
            heroLight.current.intensity = isNight ? 3.0 : 0.5; 
        }
        if (fillLight.current) {
            fillLight.current.position.set(p.x + 2, p.y + 3, p.z + 2);
            fillLight.current.intensity = isNight ? 0.8 : 0.3;
        }
    });

    return (
        <>
            <directionalLight 
                ref={dirLight} 
                castShadow 
                shadow-bias={-0.0001} 
                shadow-mapSize={[4096, 4096]} 
                shadow-camera-left={-80}
                shadow-camera-right={80}
                shadow-camera-top={80}
                shadow-camera-bottom={-80}
            />
            <spotLight
                ref={heroLight}
                color="#a5b4fc"
                angle={0.6}
                penumbra={0.5}
                distance={40}
                castShadow={false}
            />
            <pointLight
                ref={fillLight}
                color="#fbbf24"
                distance={10}
                decay={2}
                castShadow={false}
            />
        </>
    );
};

export default Lighting;