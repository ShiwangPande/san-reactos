import * as THREE from 'three';

export const damp = (current: number, target: number, lambda: number, dt: number) => {
    return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
};

export const intersectRayAABB = (rayOrigin: THREE.Vector3, rayDir: THREE.Vector3, boxMin: THREE.Vector3, boxMax: THREE.Vector3): number | null => {
    let tmin = (boxMin.x - rayOrigin.x) / rayDir.x;
    let tmax = (boxMax.x - rayOrigin.x) / rayDir.x;
    if (tmin > tmax) [tmin, tmax] = [tmax, tmin];
    let tymin = (boxMin.y - rayOrigin.y) / rayDir.y;
    let tymax = (boxMax.y - rayOrigin.y) / rayDir.y;
    if (tymin > tymax) [tymin, tymax] = [tymax, tymin];
    if ((tmin > tymax) || (tymin > tmax)) return null;
    if (tymin > tmin) tmin = tymin;
    if (tymax < tmax) tmax = tymax;
    let tzmin = (boxMin.z - rayOrigin.z) / rayDir.z;
    let tzmax = (boxMax.z - rayOrigin.z) / rayDir.z;
    if (tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];
    if ((tmin > tzmax) || (tzmin > tmax)) return null;
    if (tzmin > tmin) tmin = tzmin;
    if (tzmax < tmax) tmax = tzmax;
    if (tmax < 0) return null;
    return tmin > 0 ? tmin : 0;
};