import type {
    CommandHandler,
    CommandHandlerContext,
} from "../../engine/runtime/handlers/types";
import type { RuntimeCommand } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import {
    clampDraftCount,
    findWorldEntity,
    getDraftComponent,
    incrementShownCount,
    resolveDraftCurrentText,
    selectUniqueOptions,
    setDraftComponent,
} from "./draftUtils";
import { filterDraftEntriesByConditions } from "./draftConditionFilter";
import {
    enqueueDraftOpenedFact,
    handleEmptyDraftSelection,
} from "./triggerDraftHandlerHelpers";

export class TriggerDraftHandler implements CommandHandler<RuntimeCommand> {
    public readonly type = RuntimeCommandType.TRIGGER_DRAFT;

    public handle(
        command: RuntimeCommand,
        context: CommandHandlerContext,
    ): void {
        if (command.type !== RuntimeCommandType.TRIGGER_DRAFT) return;
        const worldEntity = findWorldEntity(context.world.entities);
        if (!worldEntity) {
            context.telemetry.log(
                "errors",
                "TRIGGER_DRAFT failed: sys_world missing.",
            );
            return;
        }

        const pool = context.cartridge.draftPools?.[command.payload.poolId];
        if (!pool || pool.entries.length === 0) {
            context.telemetry.log(
                "errors",
                `TRIGGER_DRAFT failed: pool '${command.payload.poolId}' missing.`,
            );
            return;
        }

        const optionIndex = context.cartridge.draftOptions ?? {};
        const existing = getDraftComponent(worldEntity);
        const filteredEntries = filterDraftEntriesByConditions({
            pool,
            options: optionIndex,
            conditions: context.cartridge.config?.settings?.conditions ?? [],
            worldEntities: [...context.world.entities],
            impulseEngine: context.impulseEngine,
            triggerEntityId: command.payload.triggerEntityId,
            pickedOneOffs: existing?.pickedOneOffs ?? [],
        });

        if (filteredEntries.length === 0) {
            if (handleEmptyDraftSelection(command, context)) return;
            context.telemetry.log(
                "errors",
                `TRIGGER_DRAFT failed: pool '${command.payload.poolId}' empty.`,
            );
            return;
        }

        const desired = clampDraftCount(
            command.payload.count ?? 3,
            filteredEntries.length,
        );
        const selected = selectUniqueOptions(
            { ...pool, entries: filteredEntries },
            optionIndex,
            desired,
        );

        if (selected.length === 0) {
            context.telemetry.log(
                "errors",
                `TRIGGER_DRAFT failed: pool '${command.payload.poolId}' empty.`,
            );
            return;
        }

        const shownCountsByPool = incrementShownCount(
            existing?.shownCountsByPool ?? {},
            command.payload.poolId,
        );
        const cycleNumber = shownCountsByPool[command.payload.poolId] ?? 0;

        setDraftComponent(worldEntity, {
            _tag: "draft",
            active: true,
            poolId: command.payload.poolId,
            triggerEntityId: command.payload.triggerEntityId,
            options: selected,
            sourceLabel: command.payload.label ?? "Draft",
            selectedOptionId: null,
            pickedOneOffs: existing?.pickedOneOffs ?? [],
            shownCountsByPool,
            cycleNumber,
            currentText: resolveDraftCurrentText(pool, cycleNumber),
        });
        enqueueDraftOpenedFact(command.payload.poolId, context);
    }
}

