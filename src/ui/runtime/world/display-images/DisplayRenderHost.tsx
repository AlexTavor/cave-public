import { useEffect } from "react";

export const DisplayRenderHost = (): null => {
    useEffect(() => {
        if (import.meta.env.MODE === "test") return;
        let active = true;
        let host: { start: () => void; destroy: () => void } | null = null;
        void import("../../../../engine/phaser/display-export/DisplayRenderHost").then(
            ({ DisplayRenderHost: DisplayRenderHostController }) => {
                if (!active) return;
                host = new DisplayRenderHostController();
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
