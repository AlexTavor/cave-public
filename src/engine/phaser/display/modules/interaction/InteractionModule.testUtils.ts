import { vi } from "vitest";
import type { DisplayInitContext } from "../../types";

interface FakeInput {
    enabled: boolean;
}

export interface FakeTarget {
    visible: boolean;
    input: FakeInput | null;
    listeners: Record<string, ((...args: unknown[]) => void)[]>;
    setInteractive(..._args: unknown[]): void;
    disableInteractive(): void;
    on(event: string, handler: (...args: unknown[]) => void): void;
    removeAllListeners(event: string): void;
    setData(_k: string, _v: unknown): void;
    emit(event: string): void;
}

export const makeFakeTarget = (visible = true): FakeTarget => ({
    visible,
    input: null,
    listeners: {},
    setInteractive() {
        this.input = { enabled: true };
    },
    disableInteractive() {
        if (this.input) this.input.enabled = false;
    },
    on(event, handler) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(handler);
    },
    removeAllListeners(event) {
        this.listeners[event] = [];
    },
    setData() {},
    emit(event) {
        (this.listeners[event] ?? []).forEach((handler) => handler());
    },
});

export const makeInteractionCtx = (
    backgroundImage: FakeTarget | null,
    root: FakeTarget,
    hasPhysics = true,
    radius = 10,
    entityId = "e1",
) =>
    ({
        spec: {
            entityId,
            display_key: "attr_body",
            label: "",
            styleId: null,
            hasPhysics,
            x: 0,
            y: 0,
            radius,
        },
        scratch: {
            root,
            backgroundImage,
            backgroundAnchor: null,
            effectsAnchor: null,
            overlayAnchor: null,
            mainImage: null,
            particlesManager: null,
            cycleProgressRope: null,
        },
        scene: {} as unknown,
        layers: {} as unknown,
        pools: {} as unknown,
        textureManager: {} as unknown,
        pulseEngine: {} as unknown,
        entity: {} as unknown,
        selectedEntityId: null,
        selectEntity: vi.fn(),
    }) as unknown as DisplayInitContext;
