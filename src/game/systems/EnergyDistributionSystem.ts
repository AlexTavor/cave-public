import type { Snapshot } from "../../engine/runtime/Snapshot";
import type { CommandBuffer, RuntimeCommand } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import type { System } from "../../engine/runtime/systems/System";
import {
    ATTRIBUTES,
    GRID_EPSILON,
    buildDemandContext,
    resolveDistribution,
    resolveSinkEfficiency,
    resolveStatus,
} from "./energy/energyDistributionUtils";

export class EnergyDistributionSystem implements System {
    public tick(
        snapshot: Snapshot,
        commands: CommandBuffer<RuntimeCommand>,
        _dt: number,
    ): void {
        const { supplies, totalBase, totalMax, sinks, rangesBySink } =
            buildDemandContext(snapshot.getEntities());
        const { providedBySink, drawFractionsBySink } = resolveDistribution(
            supplies,
            totalBase,
            totalMax,
            sinks,
            rangesBySink,
        );

        for (const sink of sinks) {
            const range = rangesBySink.get(sink.id);
            const provided = providedBySink.get(sink.id);
            const drawFraction = drawFractionsBySink.get(sink.id);
            if (!range || !provided || !drawFraction) continue;

            // Calculate efficiency against the UNTHROTTLED demand.
            // This ensures that 50% throttle results in 50% efficiency (if power is available).
            let efficiency = resolveSinkEfficiency(
                range.unthrottledBase,
                provided,
            );

            // FORCE SHUTDOWN: If throttle is <= 0, efficiency must be 0.
            if ((sink.powerSink.throttle ?? 1) <= 0) {
                efficiency = 0;
            }

            const status = resolveStatus(efficiency);

            const allocatedDraw = {
                body: provided.body,
                mind: provided.mind,
                social: provided.social,
            };

            const previousEfficiency = Number.isFinite(
                sink.powerSink.efficiency,
            )
                ? sink.powerSink.efficiency
                : 0;
            const previousStatus = sink.powerSink.status ?? "blackout";
            const previousDraw = sink.powerSink.drawFraction ?? {};
            const drawChanged = ATTRIBUTES.some(
                (attribute) =>
                    Math.abs(
                        (previousDraw[attribute] ?? 0) -
                            (drawFraction[attribute] ?? 0),
                    ) > GRID_EPSILON,
            );

            if (
                Math.abs(efficiency - previousEfficiency) > GRID_EPSILON ||
                status !== previousStatus ||
                drawChanged
            ) {
                const throttle = Number.isFinite(sink.powerSink.throttle)
                    ? sink.powerSink.throttle
                    : 1;
                commands.enqueue({
                    type: RuntimeCommandType.UPDATE_POWER_SINK,
                    payload: {
                        entityId: sink.id,
                        throttle,
                        efficiency,
                        drawFraction,
                        allocatedDraw,
                        status,
                    },
                });
            }
        }
    }
}
