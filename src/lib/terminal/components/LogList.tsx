import React from "react";
import { ScrollArea, Line } from "./styles";
import { LogEntry } from "../types";
import { highlightSemanticNode } from "./syntaxHighlight";

export interface LogListProps {
    logs: LogEntry[];
    bottomRef: React.RefObject<HTMLDivElement | null>;
    scrollRef: React.RefObject<HTMLDivElement | null>;
}

export const LogList: React.FC<LogListProps> = ({
    logs,
    bottomRef,
    scrollRef,
}) => (
    <ScrollArea ref={scrollRef}>
        {logs.map((log) => (
            <Line key={log.id} type={log.type}>
                {log.type === "input" ? null : (
                    <span
                        style={{
                            opacity: 0.5,
                            marginRight: 8,
                            fontSize: "0.9em",
                        }}
                    >
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>
                )}
                {highlightSemanticNode(log.content)}
            </Line>
        ))}
        <div ref={bottomRef} />
    </ScrollArea>
);
