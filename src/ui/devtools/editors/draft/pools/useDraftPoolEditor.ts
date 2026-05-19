import { useCallback, useEffect, useMemo, useState } from "react";
import type { DraftOptionBlueprint } from "../../../../../data/schemas/draft";
import { useSessionStore } from "../../../state/useSessionStore";
import { useModuleStore } from "../../../state/moduleStore";
import { useDraftPoolSlice } from "../../../state/moduleSession";
import { useModuleSession } from "../../../state/moduleSession/useModuleSession";
import { useCreatePoolOption } from "./useCreatePoolOption";
import { useDraftPoolEditorActions } from "./useDraftPoolEditorActions";

const EMPTY_OPTIONS: Record<string, DraftOptionBlueprint> = {};

export const useDraftPoolEditor = (filename: string, poolId: string) => {
    const loadModule = useModuleStore((s) => s.loadModule);
    const moduleData = useModuleStore((s) => s.modules[filename] ?? null);
    const loading = useModuleStore((s) => s.loading[filename] ?? false);
    const session = useModuleSession(filename);

    const pool = useDraftPoolSlice(filename, poolId);

    const sessionOptions = useSessionStore(
        useCallback(
            (s) => s.sessions[filename]?.draft.draftOptions ?? null,
            [filename],
        ),
    );
    const options = sessionOptions ?? moduleData?.draftOptions ?? EMPTY_OPTIONS;

    const entries = pool?.entries ?? [];
    const addedIds = useMemo(
        () => new Set(entries.map((e) => e.optionId)),
        [entries],
    );

    const [input, setInput] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!moduleData) loadModule(filename);
    }, [filename, loadModule, moduleData]);

    const title = moduleData?.metadata?.name || filename;
    const version = moduleData?.metadata?.version || "0.0.0";
    const hasError = !loading && !moduleData;
    const actions = useDraftPoolEditorActions({
        filename,
        poolId,
        entries,
        options,
        setInput,
        setError,
    });

    const createOption = useCreatePoolOption(filename, poolId, entries);

    return {
        title,
        version,
        isLoading: loading || !session.isReady,
        hasError,
        pool,
        options,
        entries,
        texts: pool?.texts ?? [],
        addedIds,
        input,
        setInput,
        error,
        addEntry: actions.addEntry,
        createOption,
        updateWeight: actions.updateWeight,
        removeEntry: actions.removeEntry,
        updateOneOff: actions.updateOneOff,
        addText: actions.addText,
        removeText: actions.removeText,
    };
};

