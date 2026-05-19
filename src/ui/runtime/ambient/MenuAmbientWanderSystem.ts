import type { Snapshot } from "../../../engine/runtime/Snapshot";
import type {
    PositionEntityCommand,
    RuntimeCommand,
} from "../../../engine/runtime/types";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import type { System } from "../../../engine/runtime/systems/System";
import type { MenuAmbientConfig } from "../../../data/schemas/game/config";
import { pseudoRandom } from "../../../utils/pseudoRandom";
import { sampleAmbientCurve } from "./sampleAmbientCurve";

interface Params {
    config: MenuAmbientConfig;
    seed: string;
    worldWidth: () => number;
    worldHeight: () => number;
}

type WanderState = {
    count: number;
    elapsed: number;
    next: number;
    command: PositionEntityCommand;
};

const createPositionCommand = (id: string): PositionEntityCommand => ({
    type: RuntimeCommandType.POSITION_ENTITY,
    payload: { id, x: 0, y: 0 },
});

export class MenuAmbientWanderSystem implements System {
    public readonly runsWhenPaused = true;
    private readonly state = new Map<string, WanderState>();

    constructor(private readonly params: Params) {}

    public tick(
        snapshot: Snapshot,
        commands: { enqueue: (c: RuntimeCommand) => void },
        dt: number,
    ): void {
        for (const entity of snapshot.query({ tag: "menu_ambient_anchor" })) {
            const id = entity.id;
            if (!id) continue;
            const body = snapshot.getPhysicsBody(id);
            const current = this.state.get(id) ?? {
                count: 0,
                elapsed: 0,
                next: this.intervalFor(id),
                command: createPositionCommand(id),
            };
            current.elapsed += dt;
            if (current.elapsed < current.next) {
                this.state.set(id, current);
                continue;
            }
            current.count += 1;
            current.elapsed = 0;
            current.next = this.intervalFor(`${id}:${current.count}`);
            const speed = this.speedFor(id);
            const ratio = Math.min(
                1,
                Math.max(0.08, speed / this.params.config.maxSpeedPxPerSecond),
            );
            const next = this.positionFor(
                id,
                current.count,
                body?.x ?? 0,
                body?.y ?? 0,
                ratio,
            );
            current.command.payload.x = next.x;
            current.command.payload.y = next.y;
            commands.enqueue(current.command);
            this.state.set(id, current);
        }
    }

    private speedFor(id: string): number {
        const roll = sampleAmbientCurve(
            pseudoRandom(`${this.params.seed}:${id}:speed`),
            this.params.config.speedCurve,
        );
        const { minSpeedPxPerSecond: min, maxSpeedPxPerSecond: max } =
            this.params.config;
        return min + roll * (max - min);
    }

    private intervalFor(id: string): number {
        const roll = pseudoRandom(`${this.params.seed}:${id}:interval`);
        const { retargetIntervalMsMin: min, retargetIntervalMsMax: max } =
            this.params.config;
        return min + roll * (max - min);
    }

    private positionFor(
        id: string,
        count: number,
        x: number,
        y: number,
        ratio: number,
    ) {
        const nextX =
            pseudoRandom(`wander-x|${this.params.seed}|${id}|${count}|17`) *
            this.params.worldWidth();
        const nextY =
            pseudoRandom(`wander-y|${this.params.seed}|${id}|${count}|71`) *
            this.params.worldHeight();
        return { x: x + (nextX - x) * ratio, y: y + (nextY - y) * ratio };
    }
}
