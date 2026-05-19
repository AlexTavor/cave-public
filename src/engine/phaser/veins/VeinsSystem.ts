import type { Runtime } from "../../runtime/Runtime";
import type { RuntimeEntity } from "../../runtime/types";
import {
    DEFAULT_VEIN_CONFIG,
    type VeinConfig,
} from "../../../data/schemas/assets";
import type { VeinGraph } from "./types";
import { GraphBuilder } from "./GraphBuilder";
import { PulseEngine } from "./PulseEngine";
import { JsonLogicAdapter } from "../../logic/JsonLogicAdapter";
import { createRuntimeVeinGraphSource } from "./veinGraphSource";
import { resolveVeinsPreset } from "./veinsPresetResolver";
import { projectVeinEdgeFlow } from "./veinFlowProjection";
import { writeVeinsDisplayData } from "./veinsDisplayWriter";
import {
    hasDemandTag,
    parseVeinConfig,
    readRawVeinConfig,
} from "./veinsRuntimeHelpers";

const HEARTBEAT_INTERVAL_MS = 200;

export class VeinsSystem {
    private readonly graph: VeinGraph = { nodes: new Map(), edges: [] };
    private readonly builder = new GraphBuilder();
    private readonly pulse: PulseEngine;
    private readonly ruleAdapter = new JsonLogicAdapter();
    private config: VeinConfig;
    private lastSeenRawConfig: unknown;
    private activePreset: string | undefined;
    private lastHeartbeatCheckMs = 0;
    private virtualTimeMs = 0;

    constructor(initialConfig?: VeinConfig) {
        this.config = initialConfig ?? DEFAULT_VEIN_CONFIG;
        this.pulse = new PulseEngine(this.config);
    }

    public update(runtime: Runtime): void {
        this.refreshConfig(runtime);
        this.advanceVirtualTime(runtime);
        this.maybeUpdateHeartbeatPreset(runtime);
        this.builder.build(createRuntimeVeinGraphSource(runtime), this.graph);
        this.applyEdgeIntensities(runtime.getEntities());
        projectVeinEdgeFlow(this.graph, runtime.getEntities());
        writeVeinsDisplayData(runtime, this.graph, this.config);
    }

    public getPulseEngine(): PulseEngine {
        return this.pulse;
    }

    public clear(): void {
        this.graph.nodes.clear();
        this.graph.edges.length = 0;
    }

    private refreshConfig(runtime: Runtime): void {
        const raw = readRawVeinConfig(runtime.getCartridge().assets);
        if (raw === this.lastSeenRawConfig) return;
        this.lastSeenRawConfig = raw;
        this.applyConfig(parseVeinConfig(runtime.getCartridge().assets));
    }

    private advanceVirtualTime(runtime: Runtime): void {
        if (runtime.getState().status !== "running") return;
        this.virtualTimeMs += runtime.getTimestep();
    }

    private maybeUpdateHeartbeatPreset(runtime: Runtime): void {
        const { preset, lastHeartbeatCheckMs } = resolveVeinsPreset(
            runtime,
            this.config,
            this.ruleAdapter,
            this.activePreset,
            this.virtualTimeMs,
            this.lastHeartbeatCheckMs,
            HEARTBEAT_INTERVAL_MS,
        );
        this.lastHeartbeatCheckMs = lastHeartbeatCheckMs;
        if (preset !== this.activePreset) {
            this.activePreset = preset;
            this.pulse.setActivePreset(preset);
        }
    }

    private applyEdgeIntensities(entities: ReadonlyArray<RuntimeEntity>): void {
        const demandIds = new Set(
            entities.filter(hasDemandTag).map((e) => e.id),
        );
        const supply = this.pulse.getSupplyPulse(this.virtualTimeMs);
        for (const edge of this.graph.edges) {
            edge.intensity = demandIds.has(edge.targetId)
                ? this.pulse.getDemandPulse(edge.targetId, this.virtualTimeMs)
                : supply;
        }
    }

    private applyConfig(config: VeinConfig): void {
        this.config = config;
        this.pulse.setConfig(config);
        this.activePreset = config.heartbeats.default;
        this.pulse.setActivePreset(this.activePreset);
    }
}

