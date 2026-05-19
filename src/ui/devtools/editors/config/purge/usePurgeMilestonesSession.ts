import { useCallback, useMemo } from "react";
import { useSessionStore } from "../../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import type { PurgeMilestone } from "../../../../../data/schemas/game/config";

const MILESTONES_PATH = "config.settings.game_config.purge.milestones";

const EMPTY: PurgeMilestone[] = [];

export { MILESTONES_PATH };

const toMilestonesArray = (value: unknown): PurgeMilestone[] => {
    if (Array.isArray(value)) return value as PurgeMilestone[];
    if (!value || typeof value !== "object") return EMPTY;
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record)
        .filter((key) => Number.isInteger(Number(key)))
        .sort((a, b) => Number(a) - Number(b));
    if (keys.length === 0) return EMPTY;
    return keys
        .map((key) => record[key])
        .filter(
            (item): item is PurgeMilestone =>
                !!item && typeof item === "object",
        );
};

export const usePurgeMilestonesSession = (filename: string) => {
    const milestones = useSessionStore(
        useCallback(
            (state) => {
                const session = state.sessions[filename];
                if (!session) return EMPTY;
                return toMilestonesArray(
                    getByPath(session.draft, MILESTONES_PATH),
                );
            },
            [filename],
        ),
    );

    const updateDraft = useSessionStore((s) => s.updateDraft);

    const addMilestone = useCallback(() => {
        const next: PurgeMilestone = {
            id: `milestone-${Date.now()}`,
            threshold: 0.5,
            messages: [],
        };
        updateDraft(filename, (draft) => {
            const current = toMilestonesArray(
                getByPath(draft, MILESTONES_PATH),
            );
            setByPath(draft, MILESTONES_PATH, [...current, next]);
        });
    }, [filename, updateDraft]);

    const removeMilestone = useCallback(
        (index: number) => {
            updateDraft(filename, (draft) => {
                const current = [
                    ...toMilestonesArray(getByPath(draft, MILESTONES_PATH)),
                ];
                current.splice(index, 1);
                setByPath(draft, MILESTONES_PATH, current);
            });
        },
        [filename, updateDraft],
    );

    return useMemo(
        () => ({ milestones, addMilestone, removeMilestone }),
        [milestones, addMilestone, removeMilestone],
    );
};

