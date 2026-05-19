import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { TELEMETRY_TABS, TelemetryTab, isTelemetryTab } from "./types";

const DEFAULT_TAB: TelemetryTab = TELEMETRY_TABS[0];

interface RuntimeToolState {
    isTerminalOpen: boolean;
    isTelemetryOpen: boolean;
    isPhysicsDebugVisible: boolean;
    activeTelemetryTab: TelemetryTab;
    selectedEntityId: string | null;
}

interface RuntimeToolActions {
    toggleTerminal: (open?: boolean) => void;
    toggleTelemetry: (open?: boolean) => void;
    togglePhysicsDebug: (visible?: boolean) => void;
    setTelemetryTab: (tab: string) => void;
    selectEntity: (id: string | null) => void;
}

export const useRuntimeToolStore = create<
    RuntimeToolState & RuntimeToolActions
>()(
    immer((set) => ({
        isTerminalOpen: false,
        isTelemetryOpen: false,
        isPhysicsDebugVisible: false,
        activeTelemetryTab: DEFAULT_TAB,
        selectedEntityId: null,

        toggleTerminal: (open) =>
            set((state) => {
                state.isTerminalOpen = open ?? !state.isTerminalOpen;
            }),

        toggleTelemetry: (open) =>
            set((state) => {
                state.isTelemetryOpen = open ?? !state.isTelemetryOpen;
            }),

        togglePhysicsDebug: (visible) =>
            set((state) => {
                state.isPhysicsDebugVisible =
                    visible ?? !state.isPhysicsDebugVisible;
            }),

        setTelemetryTab: (tab) =>
            set((state) => {
                if (!isTelemetryTab(tab)) return;
                state.activeTelemetryTab = tab;
            }),

        selectEntity: (id) =>
            set((state) => {
                state.selectedEntityId = id;
            }),
    })),
);
