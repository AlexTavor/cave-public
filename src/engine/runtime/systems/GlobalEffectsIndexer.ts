import type { Snapshot } from "../Snapshot";
import type { CommandBuffer, RuntimeCommand, RuntimeEntity } from "../types";
import type { System } from "./System";
import type { PassiveEffect } from "../../../data/schemas/components";

type BuffEntry = {
    targetTag?: string;
    effects?: PassiveEffect[];
};

export class GlobalEffectsIndexer implements System {
    private readonly buffsByTag = new Map<string, PassiveEffect[]>();

    private resolveBuffsComponent(
        snapshot: Snapshot,
        entity: RuntimeEntity,
    ): { buffs?: BuffEntry[] } | undefined {
        const ownBuffs = (entity as { buffs?: { buffs?: BuffEntry[] } }).buffs;
        if (ownBuffs) return ownBuffs;
        const blueprintId =
            typeof entity.blueprintId === "string"
                ? entity.blueprintId
                : undefined;
        if (!blueprintId) return undefined;
        return snapshot.getBlueprint(blueprintId)?.components?.buffs as
            | { buffs?: BuffEntry[] }
            | undefined;
    }

    private indexBuff(buff: BuffEntry): void {
        if (!buff?.targetTag || !Array.isArray(buff.effects)) return;
        const existing = this.buffsByTag.get(buff.targetTag);
        if (existing) {
            existing.push(...buff.effects);
            return;
        }
        this.buffsByTag.set(buff.targetTag, [...buff.effects]);
    }

    public getBuffsFor(tags: string[]): PassiveEffect[] {
        if (!Array.isArray(tags) || tags.length === 0) return [];
        const collected: PassiveEffect[] = [];
        for (const tag of tags) {
            const effects = this.buffsByTag.get(tag);
            if (effects) collected.push(...effects);
        }
        return collected;
    }

    public tick(
        snapshot: Snapshot,
        _commands: CommandBuffer<RuntimeCommand>,
        _dt: number,
    ): void {
        this.buffsByTag.clear();

        for (const entity of snapshot.getEntities()) {
            const component = this.resolveBuffsComponent(snapshot, entity);
            const buffs = component?.buffs;
            if (!Array.isArray(buffs)) continue;
            buffs.forEach((buff) => this.indexBuff(buff));
        }
    }
}
