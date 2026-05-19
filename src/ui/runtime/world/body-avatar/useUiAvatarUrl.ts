import React from "react";
import { buildBodyAvatarImageRequest } from "../../../../engine/phaser/display-export/buildBodyAvatarImageRequest";
import { buildBodyAvatarCacheKey } from "../../../../engine/phaser/display-export/buildDisplayImageCacheKey";
import { useDisplayImageExportStore } from "../../state/useDisplayImageExportStore";
import { useRuntimeStore } from "../../state/useRuntimeStore";
import { useUiAvatarStore } from "../../state/useUiAvatarStore";
import { selectBodyFallbackIconId } from "../selection/body/bodyCardSelectors";

export const useUiAvatarUrl = (subjectId: string | undefined) => {
    const runtime = useRuntimeStore((state) => state.runtime);
    const service = useDisplayImageExportStore((state) => state.service);
    const setReady = useUiAvatarStore((state) => state.setReady);
    const setError = useUiAvatarStore((state) => state.setError);
    const request = React.useMemo(() => {
        if (!subjectId) return null;
        try {
            return buildBodyAvatarImageRequest({ subjectId, runtime });
        } catch {
            return null;
        }
    }, [runtime, subjectId]);
    const cacheKey = React.useMemo(
        () => (request ? buildBodyAvatarCacheKey(request) : null),
        [request],
    );
    const entry = useUiAvatarStore((state) =>
        cacheKey ? (state.entries[cacheKey] ?? null) : null,
    );
    const fallbackIconId = React.useMemo(() => {
        const entity = subjectId ? runtime?.getEntity(subjectId) : null;
        return entity ? selectBodyFallbackIconId(entity) : undefined;
    }, [runtime, subjectId]);

    React.useEffect(() => {
        let active = true;
        if (!cacheKey || !request || entry || !service) return;
        void service.getImageUrl(request).then(
            (url) => active && setReady(cacheKey, url),
            () => active && setError(cacheKey),
        );
        return () => {
            active = false;
        };
    }, [cacheKey, entry, request, service, setError, setReady]);

    if (entry?.status === "ready")
        return { status: "ready", url: entry.url, fallbackIconId };
    if (entry?.status === "error")
        return { status: "error", url: null, fallbackIconId };
    return { status: "idle", url: null, fallbackIconId };
};
