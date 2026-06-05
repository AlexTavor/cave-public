// The contract for runtime-driven visual effects: the UI resolves sim state
// into these events (producers in ui/runtime/effects) and the phaser layer
// consumes them to spawn graphics (engine/phaser/effects). Pure type, owned by
// the engine so the phaser consumer doesn't depend on ui — the UI producers
// import it from here (ui→engine is allowed).
export type RuntimeVisualEventKind =
    | "spawn_gold_rings"
    | "spawn_body_pickup_effect"
    | "spawn_body_drop_effect"
    | "kill_smoke_puff"
    | "body_death_camera_shake";

type RuntimeWorldEffectBase = {
    entityId: string;
    x: number;
    y: number;
    radius: number;
};

export type RuntimeVisualEvent =
    | ({ kind: "spawn_gold_rings" } & RuntimeWorldEffectBase)
    | ({ kind: "spawn_body_pickup_effect" } & RuntimeWorldEffectBase)
    | ({ kind: "spawn_body_drop_effect" } & RuntimeWorldEffectBase)
    | ({ kind: "kill_smoke_puff" } & RuntimeWorldEffectBase)
    | { kind: "body_death_camera_shake" };
