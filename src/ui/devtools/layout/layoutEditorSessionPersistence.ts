import type { ModuleCartridge } from "../../../data/schemas/module";
import { deepClone } from "../../../utils/objectUtils";
import { useSessionStore } from "../state/useSessionStore";
import type { PositionUpdate } from "./persistence/layoutPersistence";
import type { ModuleDraftRef } from "./layoutEditorTypes";

interface PersistUpdatesInput {
    filename: string;
    moduleDraft: ModuleCartridge;
    moduleSourceRef: ModuleDraftRef;
    updates: PositionUpdate[];
}

export const persistLayoutUpdates = ({
    filename,
    moduleDraft,
    moduleSourceRef,
    updates,
}: PersistUpdatesInput): void => {
    const store = useSessionStore.getState();
    const source = moduleSourceRef.current;

    for (const update of updates) {
        const blueprintId = update.blueprintId;
        const blueprint = moduleDraft.blueprints[blueprintId];
        const nextPhysics = blueprint?.components?.physics;

        if (!blueprint || !nextPhysics) continue;

        if (!store.sessions[filename]) {
            const baseline = source ?? moduleDraft;
            store.initSession(filename, deepClone(baseline));
        }

        store.updateDraft(filename, (draft) => {
            const target = draft.blueprints[blueprintId];
            if (!target) return;
            target.components ??=
                {} as ModuleCartridge["blueprints"][string]["components"];
            target.components.physics = deepClone(nextPhysics);
        });
    }
};
