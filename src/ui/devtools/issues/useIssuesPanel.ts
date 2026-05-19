import { useCallback, useEffect, useMemo } from "react";
import { useShellStore } from "../shell/shell";
import { useModuleStore } from "../state/moduleStore";

export interface IssuesPanelState {
    activeModuleFilename: string | null;
    broken: {
        fromId: string;
        fromLabel: string;
        missingId: string;
        path: string;
    }[];
    onRefresh: () => void;
    onOpenBlueprint: (blueprintId: string) => void;
}

export function useIssuesPanel(): IssuesPanelState {
    const activeModuleFilename = useShellStore((s) => s.activeModuleFilename);
    const openFile = useShellStore((s) => s.openFile);

    const loadModule = useModuleStore((s) => s.loadModule);
    const getModule = useModuleStore((s) => s.getModule);
    const indexes = useModuleStore((s) => s.indexes);

    useEffect(() => {
        if (!activeModuleFilename) return;
        if (getModule(activeModuleFilename)) return;
        loadModule(activeModuleFilename);
    }, [activeModuleFilename, getModule, loadModule]);

    const broken = useMemo(() => {
        if (!activeModuleFilename) return [];
        return indexes[activeModuleFilename]?.refs?.broken ?? [];
    }, [activeModuleFilename, indexes]);

    const onOpenBlueprint = useCallback(
        (blueprintId: string) => {
            if (!activeModuleFilename) return;
            openFile(`${activeModuleFilename}::blueprints::${blueprintId}`);
        },
        [activeModuleFilename, openFile],
    );

    const onRefresh = useCallback(() => {
        if (!activeModuleFilename) return;
        loadModule(activeModuleFilename);
    }, [activeModuleFilename, loadModule]);

    return {
        activeModuleFilename,
        broken,
        onRefresh,
        onOpenBlueprint,
    };
}
