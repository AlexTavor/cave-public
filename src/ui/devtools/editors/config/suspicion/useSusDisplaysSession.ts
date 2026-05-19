import { useCallback, useMemo } from "react";
import { useSessionStore } from "../../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import type { SusDisplay } from "../../../../../data/schemas/game/susDisplay";

const SUS_DISPLAYS_PATH = "config.settings.game_config.susDisplays";
const EMPTY: SusDisplay[] = [];

const normalize = (value: unknown): SusDisplay[] =>
    Array.isArray(value) ? (value as SusDisplay[]) : EMPTY;

const createSusDisplay = (): SusDisplay => ({
    text: "",
    color: "#ff0000",
    threshold: 0,
});

const readSusDisplays = (draft: unknown) =>
    normalize(getByPath(draft, SUS_DISPLAYS_PATH));

export const useSusDisplaysSession = (filename: string) => {
    const susDisplays = useSessionStore(
        useCallback(
            (state) =>
                normalize(
                    getByPath(
                        state.sessions[filename]?.draft,
                        SUS_DISPLAYS_PATH,
                    ),
                ),
            [filename],
        ),
    );
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const addSusDisplay = useCallback(() => {
        updateDraft(filename, (draft) => {
            setByPath(draft, SUS_DISPLAYS_PATH, [
                ...readSusDisplays(draft),
                createSusDisplay(),
            ]);
        });
    }, [filename, updateDraft]);
    const removeSusDisplay = useCallback(
        (index: number) => {
            updateDraft(filename, (draft) => {
                const next = [...readSusDisplays(draft)];
                next.splice(index, 1);
                setByPath(draft, SUS_DISPLAYS_PATH, next);
            });
        },
        [filename, updateDraft],
    );
    return useMemo(
        () => ({ susDisplays, addSusDisplay, removeSusDisplay }),
        [susDisplays, addSusDisplay, removeSusDisplay],
    );
};
