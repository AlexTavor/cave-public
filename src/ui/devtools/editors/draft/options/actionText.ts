import type { BehaviorAction } from "../../../../../data/schemas/behavior";

export const formatBehaviorAction = (action: BehaviorAction): string => {
    switch (action.type) {
        case "MUTATE":
            return `${action.op} ${action.target} ${String(action.value)}`;
        case "TRANSFER":
            return `TRANSFER ${String(action.amount)} ${action.resource} FROM ${action.source} TO ${action.target}`;
        case "DISPATCH":
            return `DISPATCH ${action.entity} TO ${action.target}`;
        case "SPAWN":
            return `SPAWN ${action.blueprintId}`;
        case "SPAWN_BODY":
            return action.target
                ? `SPAWN_BODY ${action.blueprintId} TO ${action.target}`
                : `SPAWN_BODY ${action.blueprintId}`;
        case "KILL":
            return `KILL ${action.entityId}`;
        case "KILL_ALL_BODIES_EXCEPT":
            return `KILL_ALL_BODIES_EXCEPT ${action.quantity}`;
        case "ADD_TRAIT":
            return `ADD_TRAIT ${action.traitId}`;
        case "REMOVE_TRAIT":
            return `REMOVE_TRAIT ${action.traitId}`;
        case "GAIN_UNDERSTANDING":
            return action.entityId
                ? `GAIN_UNDERSTANDING ${action.understandingId} TO ${action.entityId}`
                : `GAIN_UNDERSTANDING ${action.understandingId}`;
        case "GAIN_HABITI":
            return action.entityId
                ? `GAIN_HABITI ${action.habitusId} TO ${action.entityId}`
                : `GAIN_HABITI ${action.habitusId}`;
        case "SPAWN_CARRIER":
            return `SPAWN_CARRIER ${action.tags.length} tags, ${action.commands.length} commands`;
        case "PATCH_BLUEPRINT":
            return `PATCH_BLUEPRINT ${action.blueprintId}`;
        case "TRIGGER_DRAFT":
            return `TRIGGER_DRAFT ${action.poolId}`;
        case "SHOW_CINEMATIC":
            return `SHOW_CINEMATIC ${action.lines.map((line) => JSON.stringify(line)).join(", ")}`;
        case "SHOW_NOTIFICATION_ABILITY_GUIDANCE":
            return `NOTIFY ${action.title.trim() || action.text}`;
    }

    const exhaustiveCheck: never = action;
    return exhaustiveCheck;
};

