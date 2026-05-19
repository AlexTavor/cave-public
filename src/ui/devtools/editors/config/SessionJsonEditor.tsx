import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSessionStore } from "../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../utils/objectUtils";
import { useDebouncedCallback } from "../../../runtime/world/selection/useDebouncedCallback";
import {
    JsonTextarea,
    ErrorLine,
    EditorWrap,
} from "./SessionJsonEditor.styles.ts";

const WRITE_DELAY_MS = 400;

interface SessionJsonEditorProps {
    filename: string;
    rootPath: string;
}

export const SessionJsonEditor: React.FC<SessionJsonEditorProps> = ({
    filename,
    rootPath,
}) => {
    const data = useSessionStore(
        useCallback(
            (state) => getByPath(state.sessions[filename]?.draft, rootPath),
            [filename, rootPath],
        ),
    );
    const updateDraft = useSessionStore((s) => s.updateDraft);

    const [text, setText] = useState(() => JSON.stringify(data ?? {}, null, 2));
    const [error, setError] = useState<string | null>(null);
    const lastWrittenRef = useRef(JSON.stringify(data ?? {}, null, 2));

    useEffect(() => {
        const next = JSON.stringify(data ?? {}, null, 2);
        if (next !== lastWrittenRef.current) {
            setText(next);
            lastWrittenRef.current = next;
            setError(null);
        }
    }, [data]);

    const flush = useDebouncedCallback((parsed: unknown) => {
        lastWrittenRef.current = JSON.stringify(parsed, null, 2);
        updateDraft(filename, (draft) => {
            setByPath(draft, rootPath, parsed);
        });
    }, WRITE_DELAY_MS);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const next = e.target.value;
        setText(next);
        try {
            const parsed: unknown = JSON.parse(next);
            setError(null);
            flush(parsed);
        } catch {
            setError("Invalid JSON");
        }
    };

    return (
        <EditorWrap>
            <JsonTextarea value={text} onChange={handleChange} />
            {error && <ErrorLine>{error}</ErrorLine>}
        </EditorWrap>
    );
};
