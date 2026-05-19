import type { Blueprint } from "../../../data/schemas/blueprint";
import type { NotificationAbilityConfig } from "../../../data/schemas/abilities/notifications";

const CYCLE_RESET_RULE_ID = "sys_cycle_reset";
const ASSIGNMENT_RESET_RULE_ID = "sys_assignment_complete_reset";

export const notificationCompiler = (
    draft: Blueprint,
    config: NotificationAbilityConfig,
): void => {
    if (config.length === 0) return;

    const rules = draft.components?.behavior?.rules ?? [];
    const resetRule =
        rules.find((rule) => rule.id === CYCLE_RESET_RULE_ID) ??
        rules.find((rule) => rule.id === ASSIGNMENT_RESET_RULE_ID);
    if (!resetRule) {
        console.warn(
            `Notification completion trigger ignored: no cycle or assignment reset rule on '${draft.id}'.`,
        );
        return;
    }

    for (const rule of config) {
        resetRule.actions.push({
            type: "SHOW_NOTIFICATION_ABILITY_GUIDANCE" as const,
            abilityId: rule.id,
            title: rule.title,
            text: rule.text,
            imageUrl: rule.imageUrl,
        });
    }
};

