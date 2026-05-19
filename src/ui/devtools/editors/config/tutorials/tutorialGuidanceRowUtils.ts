import { getByPath } from "../../../../../utils/objectUtils";
import { useSessionStore } from "../../../state/useSessionStore";

export const GUIDANCES_PATH = "config.settings.guidances";

export const getNextGuidanceId = (ids: string[]) => {
    let index = ids.length + 1;
    let nextId = `guidance_${index}`;
    while (ids.includes(nextId)) {
        index += 1;
        nextId = `guidance_${index}`;
    }
    return nextId;
};

export const useSelectedGuidanceDraft = (filename: string, path: string) => {
    const guidanceId = useSessionStore((state) =>
        getByPath(state.sessions[filename]?.draft, `${path}.guidanceId`),
    );
    return useSessionStore((state) => {
        const guidances = getByPath(
            state.sessions[filename]?.draft,
            GUIDANCES_PATH,
        ) as Array<{ id: string; presentation?: string }> | undefined;
        return guidances?.find((item) => item.id === guidanceId) ?? null;
    });
};
