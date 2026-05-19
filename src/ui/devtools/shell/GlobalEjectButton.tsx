import { useCallback } from "react";
import { useShellStore } from "./shell";
import { useModuleStore } from "../state/moduleStore";
import { useSessionStore } from "../state/useSessionStore";
import { parseVirtualPath } from "./window-manager/virtualPath";
import { Button } from "../../lib/atoms/button";

const useActiveBlueprint = () => {
    const path = useShellStore((s) => s.activeFilePath);
    if (!path) return null;
    const parsed = parseVirtualPath(path);
    if (parsed.kind !== "blueprint") return null;
    return {
        filename: parsed.filename,
        blueprintId: parsed.blueprintId,
    };
};

export const GlobalEjectButton = () => {
    const active = useActiveBlueprint();
    const ejectBlueprint = useModuleStore((s) => s.ejectBlueprint);
    const log = useShellStore((s) => s.log);

    const blueprint = useSessionStore(
        useCallback(
            (s) => {
                if (!active) return null;
                const draft = s.sessions[active.filename]?.draft;
                return draft?.blueprints?.[active.blueprintId] ?? null;
            },
            [active],
        ),
    );

    const canEject = !!blueprint?._editor;

    const handleEject = useCallback(async () => {
        if (!active) return;
        try {
            await ejectBlueprint({
                filename: active.filename,
                blueprintId: active.blueprintId,
            });
            log("success", "Blueprint ejected to raw mode.");
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            log("error", `Eject failed: ${msg}`);
        }
    }, [active, ejectBlueprint, log]);

    if (!active || !canEject) return null;

    return (
        <Button
            size="sm"
            variant="danger"
            onClick={handleEject}
            title="Eject blueprint to raw ECS mode"
        >
            Eject
        </Button>
    );
};
