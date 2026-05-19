import type { RuntimeEntity } from "../../../engine/runtime/types";
import { filterAssignableBodies } from "../../assignment/assignmentAcceptance";

type AttributeKey = "body" | "mind" | "social";

const ATTRIBUTE_ORDER: AttributeKey[] = ["body", "mind", "social"];

const readAttributes = (entity: RuntimeEntity) =>
    (entity as { body?: { attributes?: Record<AttributeKey, number> } }).body
        ?.attributes ?? { body: 0, mind: 0, social: 0 };

const readNeedOrder = (entity: RuntimeEntity): AttributeKey[] => {
    const sink = (entity as { powerSink?: any }).powerSink ?? {};
    return [...ATTRIBUTE_ORDER].sort((left, right) => {
        const leftUnmet =
            (sink.baseDemand?.[left] ?? 0) - (sink.allocatedDraw?.[left] ?? 0);
        const rightUnmet =
            (sink.baseDemand?.[right] ?? 0) -
            (sink.allocatedDraw?.[right] ?? 0);
        return (
            rightUnmet - leftUnmet ||
            ATTRIBUTE_ORDER.indexOf(left) - ATTRIBUTE_ORDER.indexOf(right)
        );
    });
};

export const resolveBestDropBodyId = (input: {
    target: RuntimeEntity | null;
    carriedBodies: RuntimeEntity[];
    knownHabiti: string[];
}) => {
    const carriedBodies = input.target
        ? filterAssignableBodies({
              bodies: input.carriedBodies,
              owner: input.target,
          })
        : input.carriedBodies;
    const known = new Set(input.knownHabiti);
    const butcher = input.target?.tags?.includes("cave_butcher") === true;
    const needOrder = input.target
        ? readNeedOrder(input.target)
        : ATTRIBUTE_ORDER;
    return (
        [...carriedBodies].sort((left, right) => {
            if ((input.target as { powerSink?: unknown } | null)?.powerSink) {
                const leftAttrs = readAttributes(left);
                const rightAttrs = readAttributes(right);
                for (const key of needOrder) {
                    const delta =
                        (rightAttrs[key] ?? 0) - (leftAttrs[key] ?? 0);
                    if (delta !== 0) return delta;
                }
            }
            const leftNew = ((left as any).body?.habiti ?? []).filter(
                (id: string) => !known.has(id),
            ).length;
            const rightNew = ((right as any).body?.habiti ?? []).filter(
                (id: string) => !known.has(id),
            ).length;
            if (leftNew !== rightNew)
                return butcher ? leftNew - rightNew : rightNew - leftNew;
            const leftXp = (left as { body?: { xp?: number } }).body?.xp ?? 0;
            const rightXp = (right as { body?: { xp?: number } }).body?.xp ?? 0;
            if (leftXp !== rightXp)
                return butcher ? leftXp - rightXp : rightXp - leftXp;
            return (left.id ?? "").localeCompare(right.id ?? "");
        })[0]?.id ?? null
    );
};
