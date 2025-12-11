import { Entity, EntityType, Vector3 } from '../types';

const COLLISION_CHECK_RANGE = 15;

export const checkCollision = (pos: Vector3, size: Vector3, entities: Entity[], selfId: string): boolean => {
    const minX = pos.x - size.x / 2;
    const maxX = pos.x + size.x / 2;
    const minZ = pos.z - size.z / 2;
    const maxZ = pos.z + size.z / 2;

    for (const e of entities) {
        if (e.id === selfId) continue;
        if (e.type === EntityType.PROJECTILE) continue;
        if (e.state === 'dead') continue;

        // Optimization: Skip checking entities that are far away
        const distX = Math.abs(e.pos.x - pos.x);
        const distZ = Math.abs(e.pos.z - pos.z);
        if (distX > COLLISION_CHECK_RANGE || distZ > COLLISION_CHECK_RANGE) continue;

        const eMinX = e.pos.x - e.size.x / 2;
        const eMaxX = e.pos.x + e.size.x / 2;
        const eMinZ = e.pos.z - e.size.z / 2;
        const eMaxZ = e.pos.z + e.size.z / 2;

        if (maxX > eMinX && minX < eMaxX && maxZ > eMinZ && minZ < eMaxZ) {
            return true;
        }
    }
    return false;
};