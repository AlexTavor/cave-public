import React, { useEffect, useRef, useState } from "react";
import { vfs } from "../../../../engine/vfs/FileSystem";
import { resolveVfsPath } from "./resolveVfsPath";
import { recordProjectSnapshot } from "../../state/useProjectHistoryStore";
import { getJsonAtPath, setJsonAtPath } from "./rawJsonPath";
import { applyRawJsonProjectVersion } from "./rawJsonProjectVersion";

const WRITE_DELAY_MS = 400;

interface RawJsonEditorProps {
    filename: string;
    rootPath?: string;
}

export const RawJsonEditor: React.FC<RawJsonEditorProps> = ({
    filename,
    rootPath,
}) => {
    const [text, setText] = useState("{}");
    const [error, setError] = useState<string | null>(null);
    const [documentData, setDocumentData] = useState<unknown>({});
    const [resolvedPath, setResolvedPath] = useState<string | null>(null);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        let mounted = true;
        void resolveVfsPath(filename)
            .then((path) => {
                if (!mounted) return;
                if (!path) {
                    setError(`File not found in VFS: ${filename}`);
                    return;
                }
                setResolvedPath(path);
                return vfs.readFile(path);
            })
            .then((data) => {
                if (!mounted) return;
                if (data === undefined) return;
                setDocumentData(data ?? {});
                setText(JSON.stringify(getJsonAtPath(data, rootPath), null, 2));
            });
        return () => {
            mounted = false;
        };
    }, [filename, rootPath]);

    useEffect(() => {
        return () => {
            if (timerRef.current !== null) clearTimeout(timerRef.current);
        };
    }, []);

    const writePayload = async (target: string, payload: unknown) => {
        const versionedPayload = await applyRawJsonProjectVersion(
            target,
            documentData,
            payload,
        );
        setDocumentData(versionedPayload);
        setText(
            JSON.stringify(getJsonAtPath(versionedPayload, rootPath), null, 2),
        );
        await vfs.writeFile(target, versionedPayload as never);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const next = e.target.value;
        setText(next);
        try {
            const parsed = JSON.parse(next) as never;
            setError(null);
            if (timerRef.current !== null) clearTimeout(timerRef.current);
            timerRef.current = globalThis.setTimeout(() => {
                const target = resolvedPath ?? filename;
                const payload = setJsonAtPath(documentData, rootPath, parsed);
                void recordProjectSnapshot().then(() =>
                    writePayload(target, payload),
                );
            }, WRITE_DELAY_MS);
        } catch {
            setError("Invalid JSON");
        }
    };

    return (
        <div>
            <textarea
                value={text}
                onChange={handleChange}
                rows={24}
                cols={80}
            />
            {error && <div>{error}</div>}
        </div>
    );
};

