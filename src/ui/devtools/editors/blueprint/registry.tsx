import React from "react";
import { z } from "zod";
import {
    AssignmentComponentSchema,
    DisplayComponentSchema,
    NarrativeComponentSchema,
    StateComponentSchema,
} from "../../../../data/schemas/components";
import {
    PhysicsComponentSchema,
    PHYSICS_DEFAULT_DRAG,
    PHYSICS_DEFAULT_MASS,
    PHYSICS_DEFAULT_RADIUS,
    PHYSICS_DEFAULT_X,
    PHYSICS_DEFAULT_Y,
} from "../../../../data/schemas/physics";

export type ComponentKey =
    | "display"
    | "state"
    | "assignment"
    | "narrative"
    | "physics";

export const ALL_COMPONENT_KEYS: ComponentKey[] = [
    "display",
    "state",
    "assignment",
    "narrative",
    "physics",
];

export interface ComponentEntry<TSchema extends z.ZodTypeAny> {
    label: string;
    icon: React.ReactNode;
    schema: TSchema;
    summarize: (value: z.infer<TSchema>) => React.ReactNode;
    createDefault: (bp: { label?: string }) => z.infer<TSchema>;
}

export const registry: {
    display: ComponentEntry<typeof DisplayComponentSchema>;
    state: ComponentEntry<typeof StateComponentSchema>;
    assignment: ComponentEntry<typeof AssignmentComponentSchema>;
    narrative: ComponentEntry<typeof NarrativeComponentSchema>;
    physics: ComponentEntry<typeof PhysicsComponentSchema>;
} = {
    display: {
        label: "Display",
        icon: <span>🖼️</span>,
        schema: DisplayComponentSchema,
        summarize: (value) => value.label || "Configured",
        createDefault: (bp) => ({
            label: bp.label || "Entity",
            display_key: "unknown",
            description: "",
        }),
    },
    state: {
        label: "State",
        icon: <span>📦</span>,
        schema: StateComponentSchema,
        summarize: (value) =>
            value ? `${Object.keys(value).length} vars` : "Empty",
        createDefault: () => ({}),
    },
    assignment: {
        label: "Assignment",
        icon: <span>🎒</span>,
        schema: AssignmentComponentSchema,
        summarize: (value) => {
            const slots = value.slots;
            return typeof slots === "number" ? `${slots} slots` : "Configured";
        },
        createDefault: () => ({
            slots: 1,
            filter: [],
            minimums: [],
            locking: true,
            assignedIds: [],
        }),
    },
    narrative: {
        label: "Narrative",
        icon: <span>📜</span>,
        schema: NarrativeComponentSchema,
        summarize: (value) => value.title || "Configured",
        createDefault: () => ({
            title: "",
            body: "",
            priority: "toast",
        }),
    },
    physics: {
        label: "Physics",
        icon: <span>🧲</span>,
        schema: PhysicsComponentSchema,
        summarize: (value) => `${value.radius}px @ ${value.x},${value.y}`,
        createDefault: () => ({
            x: PHYSICS_DEFAULT_X,
            y: PHYSICS_DEFAULT_Y,
            radius: PHYSICS_DEFAULT_RADIUS,
            mass: PHYSICS_DEFAULT_MASS,
            drag: PHYSICS_DEFAULT_DRAG,
            isStatic: false,
        }),
    },
};

