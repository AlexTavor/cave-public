import { DisplayTypePool } from "./DisplayTypePool";
import type { DisplayTypePoolStats } from "../../debug/phaserDebugStats";

export class DisplayPoolRegistry {
    private readonly pools = new Map<string, DisplayTypePool>();

    public get(display_key: string): DisplayTypePool {
        let pool = this.pools.get(display_key);
        if (!pool) {
            pool = new DisplayTypePool(display_key);
            this.pools.set(display_key, pool);
        }
        return pool;
    }

    public destroyAll(): void {
        for (const pool of this.pools.values()) {
            pool.drainAndDestroy();
        }
        this.pools.clear();
    }

    public getStats(): Record<string, DisplayTypePoolStats> {
        return Array.from(this.pools.entries()).reduce<
            Record<string, DisplayTypePoolStats>
        >((all, [displayKey, pool]) => {
            all[displayKey] = pool.getStats();
            return all;
        }, {});
    }
}

