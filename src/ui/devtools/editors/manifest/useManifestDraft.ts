import { useEffect, useState } from "react";
import {
    classifyManifestChange,
    parseProjectManifest,
    type ProjectManifest,
} from "../../../../engine/workspace/projectManifest";
import { vfs } from "../../../../engine/vfs/FileSystem";
import { applyProjectVersionStage } from "../../../../engine/workspace/projectVersionStage";
import {
    registerProjectSaveHandler,
    unregisterProjectSaveHandler,
} from "../../project/projectSaveRegistry";
import { recordProjectSnapshot } from "../../state/useProjectHistoryStore";
import { normalizeManifestFiles } from "./manifestPaths";

export const useManifestDraft = (filename: string) => {
    const [draft, setDraft] = useState<ProjectManifest | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async (mounted = true) => {
        const data = await vfs.readFile(filename);
        if (!mounted) return;
        const next = data ? parseProjectManifest(data, filename) : null;
        setDraft(
            next
                ? {
                      ...next,
                      files: normalizeManifestFiles(next.files, next.name),
                  }
                : null,
        );
        setIsLoading(false);
    };

    useEffect(() => {
        let mounted = true;
        setIsLoading(true);
        void load(mounted).catch((e: unknown) => {
            if (!mounted) return;
            setError(
                e instanceof Error ? e.message : "Failed to load manifest.",
            );
            setIsLoading(false);
        });
        const timer = globalThis.setInterval(() => void load(mounted), 500);
        return () => {
            mounted = false;
            globalThis.clearInterval(timer);
        };
    }, [filename]);

    useEffect(() => {
        registerProjectSaveHandler(filename, async () => {
            if (draft) await vfs.writeFile(filename, draft as never);
        });
        return () => unregisterProjectSaveHandler(filename);
    }, [draft, filename]);

    const updateDraft = async (
        transform: (draft: ProjectManifest) => ProjectManifest,
        shouldRecord = true,
    ) => {
        if (!draft) return;
        if (shouldRecord) await recordProjectSnapshot();
        const next = parseProjectManifest(transform(draft), filename);
        const changeKind = classifyManifestChange(draft, next);
        const staged = changeKind
            ? applyProjectVersionStage(
                  filename,
                  { ...next, version: draft.version },
                  changeKind,
              ).manifest
            : next;
        setDraft(staged);
        await vfs.writeFile(filename, staged as never);
    };

    return { draft, isLoading, error, updateDraft };
};

