import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { Blueprint } from "../../../../../data/schemas/blueprint";
import type { BodyComponent } from "../../../../../data/schemas/game/body";
import { coerceBlueprintId } from "../../../../../engine/runtime/blueprintId";

export const resolveBlueprintById = (
    runtime: Runtime | null,
    blueprintId: unknown,
): Blueprint | undefined => {
    const normalized = coerceBlueprintId(blueprintId);
    if (!normalized || !runtime) return undefined;
    return runtime.getCartridge().blueprints[normalized];
};
const resolveBlueprintComponents = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
): Record<string, unknown> | undefined => {
    return resolveBlueprintById(runtime, entity.blueprintId)?.components as
        | Record<string, unknown>
        | undefined;
};
export const resolveEntityDisplay = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
): Record<string, unknown> | undefined => {
    const display = (entity as { display?: Record<string, unknown> }).display;
    return (
        display ??
        (resolveBlueprintComponents(entity, runtime)?.display as
            | Record<string, unknown>
            | undefined)
    );
};
export const resolveEntityBehavior = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
): Record<string, unknown> | undefined => {
    const behavior = (entity as { behavior?: Record<string, unknown> })
        .behavior;
    return (
        behavior ??
        (resolveBlueprintComponents(entity, runtime)?.behavior as
            | Record<string, unknown>
            | undefined)
    );
};
export const resolveNonBlankText = (value: unknown): string | undefined => {
    if (typeof value !== "string") return undefined;
    const normalized = value.trim();
    return normalized || undefined;
};
export const resolveEntityLabel = (entity: RuntimeEntity): string => {
    const displayLabel = resolveNonBlankText(
        (entity as { display?: { label?: string } }).display?.label,
    );
    if (displayLabel) return displayLabel;
    const label = resolveNonBlankText(entity.label);
    if (label) return label;
    return entity.id ?? "Entity";
};
export const resolveEntityDescription = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
): string => {
    const blueprintDescription = resolveBlueprintComponents(entity, runtime)
        ?.display as { description?: unknown } | undefined;
    if (typeof blueprintDescription?.description === "string") {
        return blueprintDescription.description;
    }
    const displayDescription = (
        entity as { display?: { description?: unknown } }
    ).display?.description;
    return typeof displayDescription === "string" ? displayDescription : "";
};
export const resolveBody = (entity: RuntimeEntity): BodyComponent | undefined =>
    (entity as { body?: BodyComponent }).body;
export const resolveBodyWithBlueprint = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
): BodyComponent | undefined => {
    const body = resolveBody(entity);
    if (body) return body;
    const blueprintBody = resolveBlueprintComponents(entity, runtime)?.body;
    return blueprintBody as BodyComponent | undefined;
};
export const resolveBodySelectionTargetId = (
    entity: RuntimeEntity,
): string | undefined => (resolveBody(entity) ? entity.id : undefined);
export const resolveBodyDisplayName = (entity: RuntimeEntity): string => {
    const passportName = resolveNonBlankText(
        (entity as { body?: { passport?: { name?: string } } }).body?.passport
            ?.name,
    );
    return passportName ?? resolveEntityLabel(entity);
};

