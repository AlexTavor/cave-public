type TutorialGuidanceDraft = {
    guidanceId: string;
    targetOverride?: { kind?: string; tag?: string; entityId?: string };
};

export const resolveTutorialAutoSummary = (
    guidanceDefs: Array<{ id: string; presentation?: string; target?: any }>,
    guidances: TutorialGuidanceDraft[],
) => {
    const byId = new Map(guidanceDefs.map((item) => [item.id, item]));
    const target = guidances.find((item) => {
        if (item.targetOverride) return true;
        return byId.get(item.guidanceId)?.presentation === "node_callout";
    });
    const effective =
        target?.targetOverride ??
        (target ? byId.get(target.guidanceId)?.target : undefined);
    if (effective?.kind === "entity_tag") return `auto -> tag:${effective.tag}`;
    if (effective?.kind === "entity_id")
        return `auto -> id:${effective.entityId}`;
    return "auto -> sys_world";
};
