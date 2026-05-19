import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import type {
    TelemetryChannel,
    TelemetrySeverity,
    StickyValue,
} from "../types";
import { isTelemetryChannel } from "../types";

import { TelemetryBridge, BRIDGE_BUFFER_CAP } from "./bridgeSlice";
import {
    createEmptyStreams,
    appendWithCoalesceAndCap,
    type CoalescedTelemetryLogEntry,
} from "./streamsSlice";

export { TelemetryBridge } from "./bridgeSlice";

interface TelemetryState {
    sticky: Record<string, StickyValue>;
    streams: Record<TelemetryChannel, CoalescedTelemetryLogEntry[]>;
}

interface TelemetryActions {
    setSticky: (key: string, value: StickyValue) => void;
    log: (
        channel: TelemetryChannel,
        message: string,
        severity?: TelemetrySeverity,
    ) => void;
    syncFromBridge: () => void;
    clear: () => void;
    clearTab: (tab: string) => void;
}

export const useTelemetryStore = create<TelemetryState & TelemetryActions>()(
    immer((set) => ({
        sticky: {},
        streams: createEmptyStreams(),

        // Fast write: bridge only
        setSticky: (key, value) => {
            TelemetryBridge.sticky[key] = value;
            TelemetryBridge.stickyDirty = true;
        },

        // Fast write: bridge only
        log: (channel, message, severity = "info") => {
            if (TelemetryBridge.logQueue.length >= BRIDGE_BUFFER_CAP) {
                return;
            }
            TelemetryBridge.logQueue.push({
                channel,
                message,
                severity,
                timestamp: Date.now(),
            });
        },

        // Slow commit: only do work when there are changes
        syncFromBridge: () => {
            const hasQueuedLogs = TelemetryBridge.logQueue.length > 0;
            const hasStickyUpdates = TelemetryBridge.stickyDirty;

            if (!hasQueuedLogs && !hasStickyUpdates) return;

            set((state) => {
                if (hasStickyUpdates) {
                    state.sticky = {
                        ...state.sticky,
                        ...TelemetryBridge.sticky,
                    };
                    TelemetryBridge.stickyDirty = false;
                }

                if (hasQueuedLogs) {
                    const queue = TelemetryBridge.logQueue;

                    const nextStreams: TelemetryState["streams"] = {
                        tick: state.streams.tick,
                        systems: state.streams.systems,
                        errors: state.streams.errors,
                    };

                    const touched = new Set<TelemetryChannel>();

                    for (const item of queue) {
                        if (!touched.has(item.channel)) {
                            nextStreams[item.channel] = [
                                ...nextStreams[item.channel],
                            ];
                            touched.add(item.channel);
                        }

                        nextStreams[item.channel] = appendWithCoalesceAndCap(
                            nextStreams[item.channel],
                            {
                                message: item.message,
                                severity: item.severity,
                                timestamp: item.timestamp,
                            },
                        );
                    }

                    queue.length = 0;
                    state.streams = nextStreams;
                }
            });
        },

        clear: () =>
            set((state) => {
                state.streams = createEmptyStreams();
            }),

        clearTab: (tab) =>
            set((state) => {
                if (tab === "runtime") {
                    state.sticky = {};
                    TelemetryBridge.sticky = {};
                    TelemetryBridge.stickyDirty = false;
                    return;
                }

                if (isTelemetryChannel(tab)) {
                    state.streams[tab] = [];
                }
            }),
    })),
);
