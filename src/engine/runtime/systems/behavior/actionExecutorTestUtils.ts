import type { RuntimeCommand, RuntimeEntity } from "../../types";
import type { BehaviorContext } from "./ValueResolver";

export const createCommandBuffer = () => {
    const buffer: RuntimeCommand[] = [];
    return {
        buffer,
        commands: {
            enqueue: (command: RuntimeCommand) => buffer.push(command),
            drain: () => {
                const drained = [...buffer];
                buffer.length = 0;
                return drained;
            },
            clear: () => {
                buffer.length = 0;
            },
            size: () => buffer.length,
        },
    };
};

export const buildBehaviorContext = (params: {
    self: RuntimeEntity;
    entities?: RuntimeEntity[];
    globals?: Record<string, number>;
}): BehaviorContext => {
    const { self, entities = [], globals = {} } = params;
    const lookup = new Map(entities.map((entity) => [entity.id, entity]));

    return {
        snapshot: {
            getEntity: (id: string) => lookup.get(id),
            query: ({ tag }: { tag: string }) =>
                entities.filter((entity) =>
                    Array.isArray((entity as any).tags)
                        ? (entity as any).tags.includes(tag)
                        : false,
                ),
            getPhysicsBody: () => undefined,
        } as any,
        globals,
        self,
        sourceLane: "behavior_rule",
    };
};

