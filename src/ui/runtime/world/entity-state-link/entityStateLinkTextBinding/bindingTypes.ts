import type { EntityTextBinding, PathResolver } from "../types";

export type RuntimeLike = {
    getEntity?: (id: string) => any;
    getEntities?: () => readonly any[];
};

export type InternalTextBinding = EntityTextBinding & {
    element: HTMLElement;
    valueResolver?: PathResolver;
    maxResolver?: PathResolver;
};
