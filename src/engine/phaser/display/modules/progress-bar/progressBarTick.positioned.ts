import { resolveResourceProgressBarLiveRange } from "../../../../../lib/displays/resourceProgressBars";

export const resolvePositionedProgressBars = (input: {
    entityId: string;
    entity: unknown;
    displayBars: Array<Record<string, any>> | undefined;
    loggedDuplicates: Set<string>;
}) => {
    const positioned = new Map<string, { bar: any; live: any }>();
    for (const bar of input.displayBars ?? []) {
        const live = resolveResourceProgressBarLiveRange(
            input.entity as any,
            bar,
        );
        if (!bar.position || !live) continue;
        if (positioned.has(bar.position)) {
            const key = `${input.entityId}:${bar.position}`;
            if (!input.loggedDuplicates.has(key)) {
                input.loggedDuplicates.add(key);
                console.error(
                    `[ProgressBarsModule] duplicate bar position '${bar.position}' on '${input.entityId}'.`,
                );
            }
            continue;
        }
        positioned.set(bar.position, { bar, live });
    }
    return positioned;
};
