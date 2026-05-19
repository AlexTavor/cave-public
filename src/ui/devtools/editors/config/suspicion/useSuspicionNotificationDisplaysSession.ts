import { useCallback, useMemo } from "react";
import type { SusDisplay } from "../../../../../data/schemas/game/susDisplay";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import { useSessionStore } from "../../../state/useSessionStore";

const PATH = "config.settings.game_config.suspicionNotificationDisplays";
const EMPTY: SusDisplay[] = [];

const normalize = (value: unknown): SusDisplay[] =>
    Array.isArray(value) ? (value as SusDisplay[]) : EMPTY;

const createDisplay = (): SusDisplay => ({
    text: "",
    color: "#ff0000",
    threshold: 0,
});

const readDisplays = (draft: unknown) => normalize(getByPath(draft, PATH));

export const useSuspicionNotificationDisplaysSession = (filename: string) => {
    const displays = useSessionStore(
        useCallback(
            (state) =>
                normalize(getByPath(state.sessions[filename]?.draft, PATH)),
            [filename],
        ),
    );
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const addDisplay = useCallback(() => {
        updateDraft(filename, (draft) => {
            setByPath(draft, PATH, [...readDisplays(draft), createDisplay()]);
        });
    }, [filename, updateDraft]);
    const removeDisplay = useCallback(
        (index: number) => {
            updateDraft(filename, (draft) => {
                const next = [...readDisplays(draft)];
                next.splice(index, 1);
                setByPath(draft, PATH, next);
            });
        },
        [filename, updateDraft],
    );
    return useMemo(
        () => ({ displays, addDisplay, removeDisplay }),
        [displays, addDisplay, removeDisplay],
    );
};
