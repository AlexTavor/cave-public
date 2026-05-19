import type { ModuleCartridge } from "../../../data/schemas/module";
import type { RuntimeCartridge } from "../../linker/types";

const pick = (source: unknown, key: string): unknown => {
    if (!source || typeof source !== "object") return undefined;
    return (source as Record<string, unknown>)[key];
};

const toBlueprint = (
    id: string,
    blueprint: RuntimeCartridge["blueprints"][string],
) => {
    const direct = blueprint as unknown;
    const existing = pick(direct, "components") as
        | Record<string, unknown>
        | undefined;
    if (existing) {
        return {
            id,
            label: blueprint.label ?? "",
            tags: blueprint.tags ?? [],
            components: existing,
            _editor: pick(direct, "_editor"),
        };
    }

    return {
        id,
        label: blueprint.label ?? "",
        tags: blueprint.tags ?? [],
        components: {
            ...(pick(direct, "render")
                ? { display: pick(direct, "render") }
                : {}),
            ...(pick(direct, "state") ? { state: pick(direct, "state") } : {}),
            ...(pick(direct, "assignment")
                ? { assignment: pick(direct, "assignment") }
                : {}),
            ...(pick(direct, "behavior")
                ? { behavior: pick(direct, "behavior") }
                : {}),
            ...(pick(direct, "physics")
                ? { physics: pick(direct, "physics") }
                : {}),
            ...(pick(direct, "body") ? { body: pick(direct, "body") } : {}),
            ...(pick(direct, "cave") ? { cave: pick(direct, "cave") } : {}),
            ...(pick(direct, "powerSink")
                ? { powerSink: pick(direct, "powerSink") }
                : {}),
            ...(pick(direct, "passiveEffects")
                ? { passiveEffects: pick(direct, "passiveEffects") }
                : {}),
            ...(pick(direct, "buffs") ? { buffs: pick(direct, "buffs") } : {}),
            ...(pick(direct, "automation")
                ? { automation: pick(direct, "automation") }
                : {}),
        },
        _editor: pick(direct, "_editor"),
    };
};

export const toModuleCartridge = (
    cartridge: RuntimeCartridge,
): ModuleCartridge => {
    const assets = (cartridge.assets ?? {}) as Record<string, unknown>;
    const configRoot =
        ((cartridge.config ?? cartridge.blueprint) as
            | Record<string, unknown>
            | undefined) ?? {};

    return {
        metadata: {
            id: cartridge.metadata.id,
            name: cartridge.metadata.id,
            version: cartridge.metadata.version,
        },
        blueprints: Object.fromEntries(
            Object.entries(cartridge.blueprints).map(([id, blueprint]) => [
                id,
                toBlueprint(id, blueprint),
            ]),
        ) as ModuleCartridge["blueprints"],
        draftOptions: cartridge.draft?.draftOptions ?? {},
        draftPools: cartridge.draft?.draftPools ?? {},
        config: {
            ...configRoot,
            traits:
                cartridge.config?.traits ??
                (configRoot.traits as Record<string, unknown>) ??
                {},
            habiti:
                cartridge.config?.habiti ??
                (configRoot.habiti as Record<string, unknown>) ??
                {},
            settings: {
                ...(configRoot.settings as Record<string, unknown>),
                impulse: cartridge.config?.impulse,
                game_config: cartridge.config?.game_config,
                conditions: cartridge.config?.conditions,
                guidances: cartridge.config?.guidances,
                tutorials: cartridge.config?.tutorials,
                knowledge: cartridge.config?.knowledge,
                body: cartridge.config?.body,
                carrier: cartridge.config?.carrier,
                world: cartridge.config?.world,
            },
        },
        assets: {
            displays: (assets.displays as Record<string, unknown>) ?? {},
            glyphs: (assets.glyphs as Record<string, unknown>) ?? {},
            styles: (assets.styles as Record<string, unknown>) ?? {},
            settings: (assets.settings as Record<string, unknown>) ?? {},
        },
    } as unknown as ModuleCartridge;
};

