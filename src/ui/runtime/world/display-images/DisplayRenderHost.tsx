import { useEffect } from "react";
import { useDisplayImageExportStore } from "../../state/useDisplayImageExportStore";
import { useUiAvatarStore } from "../../state/useUiAvatarStore";

export const DisplayRenderHost = (): null => {
    useEffect(() => {
        if (import.meta.env.MODE === "test") return;
        let active = true;
        let host: { start: () => void; destroy: () => void } | null = null;
        void import("../../../../engine/phaser/display-export/DisplayRenderHost").then(
            ({ DisplayRenderHost: DisplayRenderHostController }) => {
                if (!active) return;
                // Wire the host's store writes here so the engine host stays ui-free.
                host = new DisplayRenderHostController({
                    onServiceReady: (service) =>
                        useDisplayImageExportStore
                            .getState()
                            .setService(service),
                    onTeardown: () => {
                        useDisplayImageExportStore.getState().clear();
                        useUiAvatarStore.getState().clear();
                    },
                });
                host.start();
            },
        );
        return () => {
            active = false;
            host?.destroy();
        };
    }, []);

    return null;
};
