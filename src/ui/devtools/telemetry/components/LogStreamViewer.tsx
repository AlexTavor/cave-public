import React from "react";
import { Virtuoso } from "react-virtuoso";
import { TelemetryLogEntry } from "../../../runtime/state/types";
import {
    EmptyState,
    LogRow,
    Message,
    Timestamp,
    ViewerContainer,
} from "./LogStreamViewer.styles";

export interface LogStreamViewerProps {
    logs: TelemetryLogEntry[];
}

const formatTimestamp = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString();

const renderLogItem = (index: number, log: TelemetryLogEntry) => (
    <LogRow key={`${log.id}-${index}`} severity={log.severity}>
        <Timestamp>[{formatTimestamp(log.timestamp)}]</Timestamp>
        <Message>{log.message}</Message>
    </LogRow>
);

export const LogStreamViewer: React.FC<LogStreamViewerProps> = ({ logs }) => {
    if (logs.length === 0) {
        return <EmptyState>No log entries.</EmptyState>;
    }

    return (
        <ViewerContainer>
            <Virtuoso<TelemetryLogEntry>
                data={logs}
                followOutput
                itemContent={renderLogItem}
            />
        </ViewerContainer>
    );
};
