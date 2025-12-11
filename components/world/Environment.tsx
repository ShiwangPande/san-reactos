import React from 'react';
import { Stars, Sky, Cloud, Sparkles, Environment as DreiEnvironment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise, ToneMapping, SSAO } from '@react-three/postprocessing';
import * as THREE from 'three';
import { GameSettings } from '../../types';

const CULL_DISTANCE = 150;

interface EnvironmentProps {
    isNight: boolean;
    settings: GameSettings;
}

const Environment: React.FC<EnvironmentProps> = ({ isNight, settings }) => {
    // Dynamic Fog Color: Deep Navy at night, Hazy Blue/Gray at day
    const fogColor = isNight ? '#0b1026' : '#bfdbfe';

    return (
        <>
            <color attach="background" args={[fogColor]} />
            
            {/* EXPONENTIAL FOG: Hides the edge of the world smoothly */}
            <fog attach="fog" args={[fogColor, 10, isNight ? 90 : CULL_DISTANCE - 20]} />
            
            {/* HEMISPHERE LIGHT: The "Global Ambient". Cool Sky / Warm Ground. Prevents pitch black shadows. */}
            <hemisphereLight 
                args={[
                    isNight ? '#1e3a8a' : '#bae6fd', // Sky Color (Dark Blue vs Light Blue)
                    isNight ? '#0f172a' : '#f0f9ff', // Ground Color (Dark Slate vs White)
                    isNight ? 0.3 : 0.6              // Intensity
                ]} 
            />

            <DreiEnvironment preset={isNight ? "night" : "city"} blur={0.8} background={false} />
            
            {!isNight && <Sky sunPosition={[100, 20, 100]} turbidity={8} rayleigh={0.5} mieCoefficient={0.005} mieDirectionalG={0.8} />}
            
            {isNight && (
                <group>
                    <Stars radius={100} depth={50} count={7000} factor={4} saturation={0} fade speed={1} />
                    {/* Distant City Glow/Haze */}
                    <Sparkles count={80} scale={40} size={4} speed={0.2} opacity={0.4} color="#60a5fa" position={[0, 20, -20]} />
                </group>
            )}
            
            <Cloud 
                opacity={isNight ? 0.15 : 0.6} 
                speed={0.2} 
                width={60} 
                depth={10} 
                segments={15} 
                position={[0, 35, 0]} 
                color={isNight ? "#1e293b" : "#ffffff"} 
            />

            <EffectComposer disableNormalPass={false} multisampling={0}>
                {/* SSAO: Adds depth to corners/crevices - toggle based on settings */}
                {settings.graphics.ambientOcclusion && (
                    <SSAO radius={0.15} intensity={20} luminanceInfluence={0.5} color="black" worldDistanceThreshold={15} worldDistanceFalloff={10} />
                )}
                
                {/* BLOOM: Makes streetlights and windows glow */}
                {settings.graphics.bloom && (
                    <Bloom luminanceThreshold={isNight ? 0.8 : 1.1} mipmapBlur intensity={isNight ? 1.2 : 0.6} radius={0.5} />
                )}
                
                {/* NOISE: Adds cinematic grit */}
                <Noise opacity={0.05} premultiply />
                
                <Vignette eskil={false} offset={0.1} darkness={0.4} />
                <ToneMapping mode={THREE.ACESFilmicToneMapping} exposure={1.0} />
            </EffectComposer>
        </>
    );
};

export default Environment;