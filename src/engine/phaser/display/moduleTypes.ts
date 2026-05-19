import type {
    DisplayInitContext,
    DisplayTickContext,
    DisplayDestroyContext,
} from "./types";

export interface DisplayModuleRuntime {
    id: string;
    tick(ctx: DisplayTickContext): void;
    destroy(ctx: DisplayDestroyContext): void;
}

export interface DisplayModuleFactory {
    id: string;
    create(ctx: DisplayInitContext): DisplayModuleRuntime;
}

export interface DisplayDefinition {
    display_key: string;
    moduleStack: DisplayModuleFactory[];
}
