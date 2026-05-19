import type { RuntimeEntity } from "../../../../engine/runtime/types";

export const ROOT_KEYS = new Set([
    "body",
    "cave",
    "display",
    "physics",
    "powerSink",
    "state",
]);

export type PathResolver = (entity: RuntimeEntity) => unknown;

export type BarBindingInput = {
    entityId: string;
    valuePath: string;
    maxPath?: string;
    maxValue?: number;
};

export interface EntityBarBinding extends BarBindingInput {
    id: string;
}

type TextBindingBase = { id: string; entityId: string };

type FractionWithPath = TextBindingBase & {
    kind: "compact-fraction";
    valuePath: string;
    maxPath: string;
    maxValue?: never;
};

type FractionWithValue = TextBindingBase & {
    kind: "compact-fraction";
    valuePath: string;
    maxPath?: never;
    maxValue: number;
};

type RemainingDurationBinding = TextBindingBase & {
    kind: "remaining-duration-ms";
    valuePath: string;
    maxPath: string;
};

type CycleCountdownBinding = TextBindingBase & { kind: "cycle-countdown" };

type NumericTextBinding = TextBindingBase & {
    kind: "numeric-text";
    valuePath: string;
    format: "compact-number" | "integer-percent" | "raw-number";
    multiplier?: number;
    suffix?: string;
    fallbackText?: string;
};

export type EntityTextBinding =
    | FractionWithPath
    | FractionWithValue
    | RemainingDurationBinding
    | CycleCountdownBinding
    | NumericTextBinding;

export interface EntityStateLinkContextValue {
    register: (
        id: string,
        binding: BarBindingInput,
        element: HTMLElement,
    ) => void;
    unregister: (id: string) => void;
    registerText: (
        id: string,
        binding: EntityTextBinding,
        element: HTMLElement,
    ) => void;
    unregisterText: (id: string) => void;
}

