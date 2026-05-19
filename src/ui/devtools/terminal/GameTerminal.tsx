import React, { useEffect, useLayoutEffect, useRef } from "react";
import {
    Terminal as TerminalView,
    CommandDefinition,
    defaultTerminalTheme,
} from "../../../lib/terminal";
import styled from "@emotion/styled";
import { useGameTerminal } from "./useGameTerminal";

const Root = styled.div`
    width: 100%;
    height: 100%;
    background: #111;
    display: flex;
    flex-direction: column;
`;

interface GameTerminalProps {
    extraCommands?: CommandDefinition[];
}

const CAVE_TERMINAL_THEME = {
    ...defaultTerminalTheme,
    colors: {
        ...defaultTerminalTheme.colors,
        background: "#111",
    },
};

export const GameTerminal: React.FC<GameTerminalProps> = ({
    extraCommands,
}) => {
    const {
        input,
        logs,
        suggestions,
        onChange,
        onSubmit,
        onHistoryNavigate,
        onAbort,
    } = useGameTerminal(extraCommands);

    const bottomRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const isAutoScrollRef = useRef(true);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const updateAutoScroll = () => {
            const distanceFromBottom =
                el.scrollHeight - el.scrollTop - el.clientHeight;
            isAutoScrollRef.current = distanceFromBottom <= 4;
        };

        updateAutoScroll();
        el.addEventListener("scroll", updateAutoScroll);
        return () => el.removeEventListener("scroll", updateAutoScroll);
    }, []);

    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        if (isAutoScrollRef.current) {
            el.scrollTop = el.scrollHeight;
        }
    }, [logs]);

    return (
        <Root>
            <TerminalView
                input={input}
                logs={logs}
                suggestions={suggestions}
                onInputChange={onChange}
                onSubmit={onSubmit}
                onHistoryNavigate={onHistoryNavigate}
                onAbort={onAbort}
                theme={CAVE_TERMINAL_THEME}
                bottomRef={bottomRef}
                scrollRef={scrollRef}
            />
        </Root>
    );
};

