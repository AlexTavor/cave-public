export type RuntimeInspectorWindowMode = "selection" | "pinned";

export interface RuntimeInspectorBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface RuntimeInspectorWindowRecord extends RuntimeInspectorBounds {
    id: string;
    entityId: string;
    mode: RuntimeInspectorWindowMode;
    zIndex: number;
}
