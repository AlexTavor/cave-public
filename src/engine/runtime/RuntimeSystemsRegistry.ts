import {
    AutomationSystem,
    type AutomationSnapshot,
} from "./systems/AutomationSystem";
import { BehaviorSystem } from "./systems/BehaviorSystem";
import type { System } from "./systems/System";

const defaultAutomationSnapshot: AutomationSnapshot = {
    activeCount: 0,
    nextEventMs: null,
    nextCommand: null,
};

export class RuntimeSystemsRegistry {
    private readonly automationSystem = new AutomationSystem();
    private readonly behaviorSystem = new BehaviorSystem();
    private readonly preBehaviorSystems: System[] = [];
    private readonly registeredSystems: System[] = [];
    private automationSnapshot: AutomationSnapshot = defaultAutomationSnapshot;

    public getSystems() {
        return {
            behaviorSystem: this.behaviorSystem,
            automationSystem: this.automationSystem,
            preBehaviorSystems: this.preBehaviorSystems,
            registeredSystems: this.registeredSystems,
        };
    }

    public getAutomationSnapshot(): AutomationSnapshot {
        return this.automationSnapshot;
    }

    public setAutomationSnapshot(snapshot: AutomationSnapshot): void {
        this.automationSnapshot = snapshot;
    }

    public registerSystem(system: System): void {
        this.registeredSystems.push(system);
    }

    public registerPreBehaviorSystem(system: System): void {
        this.preBehaviorSystems.push(system);
    }
}
