import { useEffect, useState } from "react";
import type { DisplayImageRequest } from "../../../../engine/phaser/display-export/DisplayImageExportTypes";
import { useDisplayImageExportStore } from "../../state/useDisplayImageExportStore";

type DisplayImageStatus = "idle" | "loading" | "ready" | "error";

export const useDisplayImageUrl = (
    request: DisplayImageRequest | null,
): { url: string | null; status: DisplayImageStatus } => {
    const service = useDisplayImageExportStore((state) => state.service);
    const [url, setUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<DisplayImageStatus>("idle");
    const requestKey = request ? JSON.stringify(request) : null;

    useEffect(() => {
        let active = true;
        if (!request || !service) {
            setUrl(null);
            setStatus("idle");
            return;
        }
        setUrl(null);
        setStatus("loading");
        Promise.resolve()
            .then(() => service.getImageUrl(request))
            .then(
                (nextUrl) => {
                    if (!active) return;
                    setUrl(nextUrl);
                    setStatus("ready");
                },
                () => {
                    if (!active) return;
                    setUrl(null);
                    setStatus("error");
                },
            );
        return () => {
            active = false;
        };
    }, [requestKey, service]);

    return { url, status };
};
