import React, { useEffect, useMemo } from "react";
import { CommandRegistry } from "../../../../lib/terminal/Registry";
import { SmartInput } from "../../../../lib/terminal/components/SmartInput";
import { TerminalContainer } from "../../../../lib/terminal/components/styles";
import { useSmartInput } from "../../../../lib/terminal/hooks/useSmartInput";
import {
    useEnsureModuleSession,
    useModuleSession,
} from "../../state/moduleSession";
import { useSessionStore } from "../../state/useSessionStore";
import { RUNTIME_COMMANDS } from "../../../runtime/terminal/runtimeRegistry";
import { useGameResourceAdapter } from "../../terminal/GameResourceAdapter";
import { useRuntimeAdapter } from "../../terminal/useRuntimeAdapter";
import { useShellStore } from "../../shell/shell";
import { isModuleSessionFilename } from "../../state/moduleSession/isModuleSessionFilename";

interface CvsEditorProps {
    filename: string;
}

export const CvsEditor: React.FC<CvsEditorProps> = ({ filename }) => {
    const activeModuleFilename = useShellStore((s) => s.activeModuleFilename);
    const sessionId = isModuleSessionFilename(activeModuleFilename)
        ? activeModuleFilename
        : filename;
    useEnsureModuleSession(sessionId);
    const session = useModuleSession(sessionId);
    const updateDraft = useSessionStore((s) => s.updateDraft);
    const registry = useMemo(() => new CommandRegistry(RUNTIME_COMMANDS), []);
    const resources = useGameResourceAdapter();
    const runtime = useRuntimeAdapter();

    const draftContent = session.draft?.scripts?.[filename] ?? "";
    const { input, setInput, setCursorPosition, suggestions } = useSmartInput({
        registry,
        initialValue: draftContent,
        context: { resources, runtime },
    });

    useEffect(() => {
        if (!session.isReady) return;
        if (input !== draftContent) {
            setInput(draftContent);
        }
    }, [session.isReady, draftContent, input, setInput]);

    if (!session.isReady) return <div>Loading...</div>;

    const handleChange = (nextValue: string) => {
        setInput(nextValue);
        updateDraft(sessionId, (draft) => {
            draft.scripts ??= {};
            draft.scripts[filename] = nextValue;
        });
    };

    return (
        <TerminalContainer id="cvs-editor">
            <SmartInput
                value={input}
                suggestions={suggestions}
                onChange={handleChange}
                onSubmit={() => {}}
                onCursorChange={setCursorPosition}
                promptLabel=""
                placeholder="# Enter script..."
                autoFocus
                multiline
            />
        </TerminalContainer>
    );
};
