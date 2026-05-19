import { useEffect } from "react";

export function useBeforeUnloadDirtyGuard(anyDirty: () => boolean) {
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (!anyDirty()) return;
            e.preventDefault();
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [anyDirty]);
}
