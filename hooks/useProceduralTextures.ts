import { useMemo } from 'react';
import * as THREE from 'three';

// --- HELPER: NOISE ---
const drawNoise = (ctx: CanvasRenderingContext2D, width: number, height: number, density: number, opacity: number, color: string = '#fff') => {
    for (let i = 0; i < width * height * density; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        ctx.fillStyle = color;
        ctx.globalAlpha = opacity;
        ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1.0;
};

// --- BUILDINGS ---
export const useBuildingTextures = () => {
    return useMemo(() => {
        const createTextureSet = (style: 'modern' | 'brick') => {
            const width = 512;
            const height = 512;
            
            const canvasA = document.createElement('canvas'); // Albedo
            const canvasN = document.createElement('canvas'); // Normal
            const canvasR = document.createElement('canvas'); // Roughness
            const canvasM = document.createElement('canvas'); // Metalness
            const canvasE = document.createElement('canvas'); // Emissive
            
            [canvasA, canvasN, canvasR, canvasM, canvasE].forEach(c => { c.width = width; c.height = height; });
            
            const ctxA = canvasA.getContext('2d')!;
            const ctxN = canvasN.getContext('2d')!;
            const ctxR = canvasR.getContext('2d')!;
            const ctxM = canvasM.getContext('2d')!;
            const ctxE = canvasE.getContext('2d')!;

            // 1. Base Materials
            if (style === 'modern') {
                ctxA.fillStyle = '#1e293b'; // Dark Blue/Grey
                ctxN.fillStyle = 'rgb(128,128,255)';
                ctxR.fillStyle = '#475569'; // Smooth
                ctxM.fillStyle = '#94a3b8'; // Metallic
            } else {
                ctxA.fillStyle = '#78350f'; // Brick Red/Brown
                ctxN.fillStyle = 'rgb(128,128,255)';
                ctxR.fillStyle = '#a8a29e'; // Rough
                ctxM.fillStyle = '#1c1917'; // Non-metallic
            }
            
            [ctxA, ctxN, ctxR, ctxM, ctxE].forEach(ctx => ctx.fillRect(0, 0, width, height));
            
            // Emissive default black
            ctxE.fillStyle = '#000000';
            ctxE.fillRect(0, 0, width, height);

            // 2. Texture Details (Noise/Bricks)
            if (style === 'brick') {
                // Brick Pattern
                ctxA.fillStyle = 'rgba(0,0,0,0.2)';
                for(let y=0; y<height; y+=16) {
                    ctxA.fillRect(0, y, width, 2);
                    const offset = (y/16) % 2 === 0 ? 0 : 16;
                    for(let x=offset; x<width; x+=32) {
                        ctxA.fillRect(x, y, 2, 16);
                    }
                }
                drawNoise(ctxA, width, height, 0.2, 0.1, '#000');
                drawNoise(ctxN, width, height, 0.2, 0.1, '#fff'); // Fake bump
            } else {
                // Modern Glass Panels
                ctxA.fillStyle = 'rgba(255,255,255,0.05)';
                ctxA.fillRect(0, 0, width, height);
                drawNoise(ctxR, width, height, 0.05, 0.05, '#fff');
            }

            // 3. Grime Gradient (Ground dirt)
            const grad = ctxA.createLinearGradient(0, height, 0, 0);
            grad.addColorStop(0, 'rgba(0,0,0,0.8)');
            grad.addColorStop(0.2, 'rgba(0,0,0,0.2)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctxA.fillStyle = grad;
            ctxA.fillRect(0, 0, width, height);

            // 4. Windows
            const rows = style === 'modern' ? 12 : 8;
            const cols = style === 'modern' ? 8 : 6;
            const padX = style === 'modern' ? 10 : 25;
            const padY = style === 'modern' ? 10 : 40;
            
            const winW = (width - (cols + 1) * padX) / cols;
            const winH = (height - (rows + 1) * padY) / rows;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (Math.random() > 0.1) { // 10% chance no window (wall)
                        const x = padX + c * (winW + padX);
                        const y = padY + r * (winH + padY);
                        
                        // Glass Surface
                        ctxA.fillStyle = '#0f172a'; ctxA.fillRect(x, y, winW, winH);
                        ctxR.fillStyle = '#000000'; ctxR.fillRect(x, y, winW, winH); // Super shiny
                        ctxM.fillStyle = '#475569'; ctxM.fillRect(x, y, winW, winH);
                        
                        // Lights
                        if (Math.random() > (style === 'modern' ? 0.3 : 0.5)) {
                            const intensity = 0.5 + Math.random() * 0.5;
                            if (style === 'modern') {
                                // Cool Corporate Light
                                ctxE.fillStyle = `rgba(200, 240, 255, ${intensity})`;
                            } else {
                                // Warm Residential Light
                                ctxE.fillStyle = `rgba(255, 200, 140, ${intensity})`;
                            }
                            // Inset light
                            const border = style === 'modern' ? 0 : 4;
                            ctxE.fillRect(x + border, y + border, winW - border*2, winH - border*2);
                        }
                    }
                }
            }

            const toTex = (c: HTMLCanvasElement, isColor: boolean = true) => {
                const t = new THREE.CanvasTexture(c);
                t.wrapS = THREE.RepeatWrapping;
                t.wrapT = THREE.RepeatWrapping;
                t.anisotropy = 4;
                if (isColor) t.colorSpace = THREE.SRGBColorSpace;
                else t.colorSpace = THREE.LinearSRGBColorSpace;
                return t;
            };

            return { 
                map: toTex(canvasA), 
                normalMap: toTex(canvasN, false), 
                roughnessMap: toTex(canvasR, false), 
                metalnessMap: toTex(canvasM, false), 
                emissiveMap: toTex(canvasE) 
            };
        };

        return {
            modern: createTextureSet('modern'),
            brick: createTextureSet('brick')
        };
    }, []);
};

// --- ROAD (With Puddles & Cracks) ---
export const useRoadTextures = () => {
    return useMemo(() => {
        const size = 1024;
        const canvas = document.createElement('canvas');
        const canvasR = document.createElement('canvas'); // Roughness map for puddles
        canvas.width = size; canvas.height = size;
        canvasR.width = size; canvasR.height = size;

        const ctx = canvas.getContext('2d')!;
        const ctxR = canvasR.getContext('2d')!;

        // 1. Base Asphalt
        ctx.fillStyle = '#262626';
        ctx.fillRect(0, 0, size, size);
        // Smoother base for better reflection interaction (lower hex = smoother)
        ctxR.fillStyle = '#b0b0b0'; 
        ctxR.fillRect(0, 0, size, size);

        // 2. Grain Noise
        drawNoise(ctx, size, size, 0.05, 0.1, '#555');
        drawNoise(ctx, size, size, 0.05, 0.1, '#000');

        // 3. Cracks
        ctx.strokeStyle = '#0a0a0a';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        for(let i=0; i<12; i++) {
            ctx.beginPath();
            let x = Math.random() * size;
            let y = Math.random() * size;
            ctx.moveTo(x,y);
            for(let j=0; j<15; j++) {
                x += (Math.random()-0.5) * 60;
                y += (Math.random()-0.5) * 60;
                ctx.lineTo(x,y);
            }
            ctx.stroke();
        }
        ctx.globalAlpha = 1.0;

        // 4. Puddles (Darker & Shiny)
        for(let i=0; i<6; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 30 + Math.random() * 50;
            
            // Darken Albedo
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, 'rgba(0,0,0,0.4)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();

            // Shiny Roughness (Black = Smooth/Mirror)
            const gR = ctxR.createRadialGradient(x, y, 0, x, y, r);
            gR.addColorStop(0, '#000000');
            gR.addColorStop(1, '#b0b0b0');
            ctxR.fillStyle = gR;
            ctxR.beginPath(); ctxR.arc(x, y, r, 0, Math.PI*2); ctxR.fill();
        }

        // 5. Markings (White Dashed Line)
        ctx.strokeStyle = '#d4d4d4';
        ctx.lineWidth = 6;
        ctx.setLineDash([40, 40]);
        ctx.beginPath();
        ctx.moveTo(size/2, 0);
        ctx.lineTo(size/2, size);
        ctx.stroke();

        // 6. Side Lines
        ctx.setLineDash([]);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(10, 0); ctx.lineTo(10, size);
        ctx.moveTo(size-10, 0); ctx.lineTo(size-10, size);
        ctx.stroke();

        const tex = new THREE.CanvasTexture(canvas);
        const texR = new THREE.CanvasTexture(canvasR);
        [tex, texR].forEach(t => {
            t.wrapS = THREE.RepeatWrapping;
            t.wrapT = THREE.RepeatWrapping;
            t.repeat.set(2, 2); // Tiling to increase perceived resolution
            t.anisotropy = 8;
            t.colorSpace = THREE.SRGBColorSpace;
        });
        texR.colorSpace = THREE.LinearSRGBColorSpace;

        return { map: tex, roughnessMap: texR };
    }, []);
};

// --- SIDEWALK (Concrete Grid) ---
export const useSidewalkTexture = () => {
    return useMemo(() => {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        // Base Concrete
        ctx.fillStyle = '#a8a29e'; // Warm grey
        ctx.fillRect(0, 0, size, size);

        // Noise
        drawNoise(ctx, size, size, 0.1, 0.05, '#000');
        drawNoise(ctx, size, size, 0.1, 0.05, '#fff');

        // Grid Lines
        ctx.strokeStyle = '#78716c';
        ctx.lineWidth = 4;
        const tileSize = size / 4;
        
        ctx.beginPath();
        for(let i=0; i<=4; i++) {
            ctx.moveTo(i * tileSize, 0); ctx.lineTo(i * tileSize, size);
            ctx.moveTo(0, i * tileSize); ctx.lineTo(size, i * tileSize);
        }
        ctx.stroke();

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 2);
        tex.anisotropy = 4;
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }, []);
};

// --- NATURE (Grass/Sand Noise) ---
export const useNatureTexture = () => {
    return useMemo(() => {
        const size = 512;
        const canvas = document.createElement('canvas');
        const canvasN = document.createElement('canvas'); // Normal map
        canvas.width = size; canvas.height = size;
        canvasN.width = size; canvasN.height = size;
        
        const ctx = canvas.getContext('2d')!;
        const ctxN = canvasN.getContext('2d')!;

        // Base Albedo - More green variation
        ctx.fillStyle = '#65a30d'; 
        ctx.fillRect(0, 0, size, size);
        
        // Base Normal (Flat Blue)
        ctxN.fillStyle = '#8080ff'; 
        ctxN.fillRect(0, 0, size, size);

        // Large Organic Patches for variation
        for (let i = 0; i < 60; i++) {
             const x = Math.random() * size;
             const y = Math.random() * size;
             const r = 30 + Math.random() * 80;
             
             // Albedo Dark/Light patches
             const val = Math.random() > 0.5 ? 0 : 255;
             const opacity = 0.05 + Math.random() * 0.1;
             
             ctx.fillStyle = val === 0 ? `rgba(0,50,0,${opacity})` : `rgba(200,255,100,${opacity})`;
             ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
        
        // High frequency noise for texture
        drawNoise(ctx, size, size, 0.6, 0.15, '#2f5d18'); // Dark speckles
        drawNoise(ctx, size, size, 0.6, 0.15, '#a3e635'); // Light speckles
        
        // Generate pseudo-normal map detail from noise
        for(let i=0; i<3000; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 2 + Math.random() * 4;
            const rVal = 100 + Math.random() * 55;
            const gVal = 100 + Math.random() * 55;
            ctxN.fillStyle = `rgba(${rVal},${gVal},255, 0.5)`;
            ctxN.beginPath(); ctxN.arc(x, y, r, 0, Math.PI*2); ctxN.fill();
        }

        const tex = new THREE.CanvasTexture(canvas);
        const texN = new THREE.CanvasTexture(canvasN);
        
        [tex, texN].forEach(t => {
            t.wrapS = THREE.RepeatWrapping;
            t.wrapT = THREE.RepeatWrapping;
            // Key Fix: Repeat the texture 4x to avoid giant blurry pixels
            t.repeat.set(4, 4); 
            t.anisotropy = 4;
            t.colorSpace = THREE.SRGBColorSpace;
        });
        texN.colorSpace = THREE.LinearSRGBColorSpace;

        return { map: tex, normalMap: texN };
    }, []);
};
