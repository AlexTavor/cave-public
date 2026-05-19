import type { RuntimeEntity } from "../../../runtime/types";
import type { DisplaySpec } from "../types";
import type { DisplayInstanceManagerDeps } from "./DisplayInstanceManager.types";
import type { EntityVisualInstance } from "../visual-instance/EntityVisualInstance";
import { removeNodeOverlayDisplayBounds } from "../node-overlay/nodeOverlayDisplayBoundsStore";

type InstanceRecord = { spec: DisplaySpec; entity: RuntimeEntity };

export const destroyManagedInstance = (
    entityId: string,
    instances: Map<string, EntityVisualInstance>,
    records: Map<string, InstanceRecord>,
): void => {
    const instance = instances.get(entityId);
    if (!instance) return;
    const record = records.get(entityId);
    if (record) instance.destroy(record.spec, record.entity);
    removeNodeOverlayDisplayBounds(entityId);
    instances.delete(entityId);
    records.delete(entityId);
};

export const removeStaleInstances = (
    seen: Set<string>,
    instances: Map<string, EntityVisualInstance>,
    records: Map<string, InstanceRecord>,
): void => {
    for (const id of instances.keys()) {
        if (!seen.has(id)) destroyManagedInstance(id, instances, records);
    }
};

export const clearDisplayRegistries = (
    deps: DisplayInstanceManagerDeps,
): void => {
    deps.glyphRegistry.clear();
    deps.avatarRegistry.clear();
};

export const syncDisplayEpochs = (
    deps: DisplayInstanceManagerDeps,
    runtime: { getCartridge: () => any; getState: () => { seed: string } },
): void => {
    const cartridge = runtime.getCartridge();
    deps.glyphRegistry.syncEpoch(
        runtime.getState().seed,
        cartridge.assets?.glyphs,
        cartridge.assets?.settings,
    );
    deps.avatarRegistry.syncEpoch(runtime.getState().seed);
};
