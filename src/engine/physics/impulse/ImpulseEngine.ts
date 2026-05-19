import type { ImpulseConfig } from "../../../data/schemas/physics";
import type { ImpulseForceField } from "./ImpulseForceField";
import type { ArrivalEvent, PhysicsBody } from "./types";
import { applySteeringStep } from "./ImpulseEngineSteering";
import { integrateBodies } from "./ImpulseEngineIntegration";
import { collectArrivals, resolveHardAnchors } from "./ImpulseEngineAnchors";
import { ensureBodyDefaults } from "./ImpulseEngineUtils";

const MAX_PHYSICS_STEP = 0.004;
const ABSOLUTE_MAX_SUBSTEPS = 48;

export class ImpulseEngine {
    private readonly bodies = new Map<string, PhysicsBody>();
    private config: ImpulseConfig;
    private worldWidth: number | null = null;
    private worldHeight: number | null = null;
    private readonly queryBuffer: PhysicsBody[] = [];
    private externalFields: ImpulseForceField[] = [];
    private previousStepDt = MAX_PHYSICS_STEP;
    private accumulatedTime = 0;

    public constructor(config: ImpulseConfig) {
        this.config = config;
    }

    public addBody(body: PhysicsBody): void {
        ensureBodyDefaults(body);
        this.bodies.set(body.id, body);
    }

    public removeBody(id: string): void {
        this.bodies.delete(id);
    }

    public setTarget(bodyId: string, targetId: string | null): void {
        const body = this.bodies.get(bodyId);
        if (!body) return;
        body.targetId = targetId ?? undefined;
    }

    public setWorldBounds(width: number, height: number): void {
        if (!Number.isFinite(width) || !Number.isFinite(height)) return;
        if (
            width < this.config.minWorldSize ||
            height < this.config.minWorldSize
        ) {
            return;
        }
        this.worldWidth = width;
        this.worldHeight = height;
    }

    public updateConfig(config: ImpulseConfig): void {
        this.config = config;
    }

    public setExternalForceFields(fields: ImpulseForceField[]): void {
        this.externalFields = [...fields];
    }

    public tick(dtSeconds: number): ArrivalEvent[] {
        if (this.bodies.size === 0) return [];

        const safeDtSeconds =
            Number.isFinite(dtSeconds) && dtSeconds > 0
                ? dtSeconds
                : this.config.defaultDtMs / 1000;

        this.accumulatedTime += safeDtSeconds;

        const requiredSteps = Math.ceil(safeDtSeconds / MAX_PHYSICS_STEP);
        const configMax = Math.max(1, Math.floor(this.config.maxSubSteps));
        const effectiveLimit = Math.max(
            configMax,
            Math.min(requiredSteps, ABSOLUTE_MAX_SUBSTEPS),
        );

        const subSteps = Math.min(Math.max(1, requiredSteps), effectiveLimit);
        const stepSeconds = safeDtSeconds / subSteps;

        let timeCorrection = 1;
        if (this.previousStepDt > 0) {
            timeCorrection = stepSeconds / this.previousStepDt;
        }

        for (let i = 0; i < subSteps; i += 1) {
            applySteeringStep({
                bodies: this.bodies,
                config: this.config,
                queryBuffer: this.queryBuffer,
                externalFields: this.externalFields,
                worldWidth: this.worldWidth,
                worldHeight: this.worldHeight,
                time: this.accumulatedTime,
            });

            const correction = i === 0 ? timeCorrection : 1;

            integrateBodies({
                bodies: this.bodies,
                config: this.config,
                worldWidth: this.worldWidth,
                worldHeight: this.worldHeight,
                stepSeconds,
                timeCorrection: correction,
            });
            resolveHardAnchors(this.bodies);
        }

        this.previousStepDt = stepSeconds;

        return collectArrivals(this.bodies);
    }

    public getBody(id: string): PhysicsBody | undefined {
        return this.bodies.get(id);
    }
}
