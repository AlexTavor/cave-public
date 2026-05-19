import { expect } from "vitest";
import { World } from "miniplex";
import { Blueprint } from "../../data/schemas/blueprint";

// Mock Entity Type (simplified for the test runner)
type Entity = {
    id: string;
    [key: string]: any;
};

export class Scenario {
    private readonly world: World<Entity>;
    private readonly systems: {
        update(dt: number): void;
    }[] = []; // List of active systems for this scenario
    private time = 0;

    constructor() {
        this.world = new World<Entity>();
        // Initialize default systems
        // this.systems = [new StateSystem(this.world), new FlowSystem(this.world)];
    }

    /** Setup: Create an entity with specific components */
    public given(id: string, components: Partial<Blueprint["components"]>) {
        this.world.add({ id, ...components });
        return this;
    }

    /** Setup: Load a full Blueprint fixture */
    public givenBlueprint(blueprint: Blueprint) {
        this.world.add({ id: blueprint.id, ...blueprint.components });
        return this;
    }

    /** Action: Run the game loop for N seconds */
    public whenTick(seconds: number) {
        // Simulate discrete ticks (e.g. 10 ticks per second)
        const tickRate = 0.1;
        let remaining = seconds;

        while (remaining > 0) {
            const dt = Math.min(remaining, tickRate);
            this.systems.forEach((sys) => sys.update(dt));
            this.time += dt;
            remaining -= dt;
        }
        return this;
    }

    /** Assertion: Check a value in Storage/State */
    public thenState(entityId: string, key: string) {
        const entity = this.world.where((e) => e.id === entityId).first;
        if (!entity) throw new Error(`Entity ${entityId} not found`);
        if (!entity.state?.[key])
            throw new Error(`State ${key} not found on ${entityId}`);

        const actual = entity.state[key].value; // Assuming value is resolved to number

        return {
            is: (expected: number) => {
                expect(actual).toBeCloseTo(expected, 4); // Floating point safety
                return this;
            },
            isGreaterThan: (expected: number) => {
                expect(actual).toBeGreaterThan(expected);
                return this;
            },
        };
    }

    /** Debug: Dump world state */
    public debug() {
        console.log(JSON.stringify(this.world.entities, null, 2));
        return this;
    }
}
