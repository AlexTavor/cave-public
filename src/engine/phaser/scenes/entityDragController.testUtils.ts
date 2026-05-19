import { Snapshot } from "../../runtime/Snapshot";
import { vi } from "vitest";

export const createScene = () =>
    ({ input: { on: vi.fn(), off: vi.fn() } }) as any;

export const createRuntime = (input: {
    entities?: any[];
    physics?: Record<string, { x: number; y: number; radius?: number }>;
}) => {
    const queued: unknown[] = [];
    const entities = input.entities ?? [];
    const physics = input.physics ?? {};
    const getBody = (id: string) => {
        const body = physics[id];
        return body
            ? { ...body, position: { x: body.x, y: body.y } }
            : undefined;
    };
    return {
        queued,
        commands: { enqueue: (command: unknown) => queued.push(command) },
        flushCommands: vi.fn(() => queued.length),
        stepOncePreservingPause: vi.fn(() => 1),
        getState: () => ({ status: "paused" as const }),
        getEntity: (id: string) => entities.find((entity) => entity.id === id),
        getPhysicsBody: getBody,
        createSnapshot: () => new Snapshot(entities, { getBody } as any),
    };
};
