import { useCallback, useEffect, useMemo, useState } from "react";
import { vfs } from "../../../../engine/vfs/FileSystem";
import { useLayoutStore } from "../../state/useLayoutStore";
import { useToastStore } from "../../toast/toastStore";
import { openFileTab } from "../../shell/window-manager/openFileTab";
import { useManifestDraft } from "./useManifestDraft";
import { buildAddOptions, normalizeManifestFiles } from "./manifestPaths";

const EXTENSIONS = [".cave", ".art", ".bp", ".draft"];

const folderOf = (path: string) => {
    const idx = path.lastIndexOf("/");
    return idx >= 0 ? path.slice(0, idx) : "";
};

export const useManifestEditorController = (filename: string) => {
    const { draft, isLoading, error, updateDraft } = useManifestDraft(filename);
    const [selected, setSelected] = useState<string | null>(null);
    const [addSelection, setAddSelection] = useState("");
    const [dragging, setDragging] = useState<string | null>(null);
    const [allFiles, setAllFiles] = useState<string[]>([]);
    const openTab = useLayoutStore((s) => s.openTab);
    const pushToast = useToastStore((s) => s.push);
    const projectFolder = folderOf(filename);

    useEffect(() => {
        void (async () => {
            const prefix = projectFolder ? `${projectFolder}/` : "";
            const scans = await Promise.all(
                EXTENSIONS.map((ext) => vfs.scan(`${prefix}*${ext}`)),
            );
            setAllFiles([...new Set(scans.flat())]);
        })();
    }, [filename]);

    const handleAutoImport = useCallback(async () => {
        if (!draft) return;
        const prefix = projectFolder ? `${projectFolder}/` : "";
        const scans = await Promise.all(
            EXTENSIONS.map((ext) => vfs.scan(`${prefix}*${ext}`)),
        );
        const found = buildAddOptions(scans.flat(), draft.files, projectFolder);
        await updateDraft((prev) => ({
            ...prev,
            files: [...prev.files, ...found],
        }));
        pushToast("success", `Imported ${found.length} file(s).`);
    }, [draft, projectFolder, pushToast, updateDraft]);

    const remaining = useMemo(
        () =>
            draft ? buildAddOptions(allFiles, draft.files, projectFolder) : [],
        [allFiles, draft, projectFolder],
    );

    const onNameChange = (nextName: string) =>
        void updateDraft((prev) => ({
            ...prev,
            name: nextName,
            files: normalizeManifestFiles(prev.files, nextName),
        }));

    const onAdd = () => {
        if (!addSelection) return;
        void updateDraft((prev) => ({
            ...prev,
            files: [...prev.files, addSelection],
        }));
        setAddSelection("");
    };

    const onOpen = (file: string) => openFileTab(openTab, file);

    const onDelete = (file: string) =>
        void updateDraft((prev) => ({
            ...prev,
            files: prev.files.filter((item) => item !== file),
        }));

    const onDrop = (target: string) => {
        if (!dragging) return;
        void updateDraft((prev) => {
            if (dragging === target) return prev;
            const from = prev.files.indexOf(dragging);
            const to = prev.files.indexOf(target);
            if (from < 0 || to < 0) return prev;
            const next = [...prev.files];
            next.splice(from, 1);
            next.splice(to, 0, dragging);
            return { ...prev, files: next };
        });
    };

    return {
        draft,
        isLoading,
        error,
        selected,
        addSelection,
        dragging,
        remaining,
        setSelected,
        setAddSelection,
        setDragging,
        handleAutoImport,
        onNameChange,
        onAdd,
        onOpen,
        onDelete,
        onDrop,
    };
};
