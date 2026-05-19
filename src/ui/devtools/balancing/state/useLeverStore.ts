import { create } from "zustand";
import {
    Scanner,
    type LeverDefinition,
} from "../../../../engine/balancing/Scanner";
import { useSessionStore } from "../../state/useSessionStore";
import { patchCartridge } from "../utils/cartridgePatcher";
import type {
    SimulationRunConfig,
    LeverStoreState,
    LeverStoreActions,
} from "./leverStore.types";

export type { SimulationRunConfig, LeverStoreState, LeverStoreActions };

const scanner = new Scanner();

const buildPromotionName = (lever: LeverDefinition): string => {
    const base = lever.target ?? "value";
    const targetKey = base
        .replace(/^self\.state\./, "")
        .replace(/\.value$/, "")
        .split(".")
        .filter(Boolean)
        .join("_");

    return `${lever.ruleId ?? "rule"}_${targetKey}`;
};

export const useLeverStore = create<LeverStoreState & LeverStoreActions>(
    (set, get) => ({
        levers: [],
        overrides: {},
        promotions: {},
        simulationResult: null,
        isRunning: false,
        simulationConfig: {
            scriptId: "",
            durationSeconds: 5,
        },

        scan: (cartridge) => {
            set({ levers: scanner.scan(cartridge) });
        },

        setOverride: (id, value) =>
            set((state) => {
                const next = { ...state.overrides };
                if (value === null || !Number.isFinite(value)) {
                    delete next[id];
                } else {
                    next[id] = value;
                }
                return { overrides: next };
            }),

        promoteLever: (id) =>
            set((state) => {
                if (state.promotions[id]) return state;
                const lever = state.levers.find((entry) => entry.id === id);
                if (lever?.type !== "behavior") return state;
                return {
                    promotions: {
                        ...state.promotions,
                        [id]: buildPromotionName(lever),
                    },
                };
            }),

        setSimulationResult: (result) =>
            set({ simulationResult: result, isRunning: false }),

        setIsRunning: (isRunning) => set({ isRunning }),

        setSimulationConfig: (config) =>
            set((state) => ({
                simulationConfig: { ...state.simulationConfig, ...config },
            })),

        commit: (filename) => {
            const session = useSessionStore.getState().sessions[filename];
            if (!session) return;
            const { overrides, promotions, levers } = get();
            const nextDraft = patchCartridge(
                session.draft,
                overrides,
                promotions,
                levers,
            );
            useSessionStore.getState().replaceDraft(filename, nextDraft);
            set({ overrides: {}, promotions: {}, simulationResult: null });
        },
    }),
);
