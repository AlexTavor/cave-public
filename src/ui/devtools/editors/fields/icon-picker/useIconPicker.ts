import { useMemo, useState, useCallback } from "react";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import { useSessionStore } from "../../../state/useSessionStore";
import { useModuleStore } from "../../../state/moduleStore";
import { useEnsureModuleSession } from "../../../state/moduleSession";
import { resolveVisualAssetFilename } from "../../blueprint/visuals/visualAssetLinking";

export const useIconPicker = (filename: string, path: string) => {
    const value = useSessionStore(
        useCallback(
            (state) => {
                const session = state.sessions[filename];
                if (!session) return "";
                return (getByPath(session.draft, path) as string) || "";
            },
            [filename, path],
        ),
    );

    const updateDraft = useSessionStore((state) => state.updateDraft);
    const assetFilename = resolveVisualAssetFilename(filename);
    useEnsureModuleSession(assetFilename);
    const assetDraft = useSessionStore(
        (state) => state.sessions[assetFilename]?.draft ?? null,
    );
    const assetModule = useModuleStore(
        (state) => state.modules[assetFilename] ?? null,
    );

    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const iconKeys = useMemo(() => {
        const q = search.trim().toLowerCase();
        const keys = [
            ...new Set<string>([
                ...Object.keys(assetModule?.assets?.displays ?? {}),
                ...Object.keys(assetDraft?.assets?.displays ?? {}),
                ...(value ? [value] : []),
            ]),
        ];
        const filtered = q
            ? keys.filter((k) => k.toLowerCase().includes(q))
            : keys;
        filtered.sort((a, b) => a.localeCompare(b));
        return filtered;
    }, [assetDraft, assetModule, search, value]);

    const canCreate = Boolean(assetFilename && search.trim());
    const showCreateCta = canCreate && iconKeys.length === 0;

    const handleSelect = (key: string) => {
        updateDraft(filename, (draft) => {
            setByPath(draft, path, key);
        });
        setIsOpen(false);
    };

    const openCreate = () => {
        setIsOpen(false);
        setIsCreateOpen(true);
    };

    return {
        value,
        assetFilename,
        isOpen,
        setIsOpen,
        search,
        setSearch,
        isCreateOpen,
        setIsCreateOpen,
        iconKeys,
        showCreateCta,
        handleSelect,
        openCreate,
    };
};

