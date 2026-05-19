import type { BehaviorContext } from "./ValueResolver.types";
import type { RuntimeEntity } from "../../types";

export const resolveToken = (
  token: string,
  context: BehaviorContext,
): number => {
  const numeric = Number(token);
  if (Number.isFinite(numeric)) return numeric;
  return resolvePath(token, context);
};

export const resolvePath = (path: string, context: BehaviorContext): number => {
  const normalized = path.trim();
  if (!normalized) return 0;

  if (normalized.startsWith("global.")) {
    return resolveFromGlobals(
      normalized.slice("global.".length),
      context.globals,
    );
  }

  if (normalized.startsWith("globals.")) {
    return resolveFromGlobals(
      normalized.slice("globals.".length),
      context.globals,
    );
  }

  if (normalized.startsWith("self.")) {
    return resolveFromEntity(context.self, normalized.slice("self.".length));
  }

  const [base, ...rest] = normalized.split(".");
  if (!base) return 0;

  const entity = context.snapshot.getEntity(base);
  if (!entity) return 0;
  return resolveFromEntity(entity, rest.join("."));
};

const resolveFromGlobals = (
  path: string,
  globals: Record<string, number>,
): number => {
  const [key] = path.split(".");
  if (!key) return 0;
  const value = globals[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

const resolveFromEntity = (entity: RuntimeEntity, path: string): number => {
  if (!path) return 0;
  const segments = path.split(".");
  let current: any = entity;

  for (const segment of segments) {
    if (current == null) return 0;
    current = current[segment];
  }

  let result = 0;

  if (typeof current === "number" && Number.isFinite(current)) {
    result = current;
  } else if (typeof current === "boolean") {
    return current ? 1 : 0;
  } else if (current && typeof current === "object") {
    const value = (current as { value?: unknown }).value;
    if (typeof value === "number" && Number.isFinite(value)) {
      result = value;
    }
  }

  const incoming = getIncomingForPath(entity, segments);
  if (incoming > 0) result += incoming;

  return result;
};

const getIncomingForPath = (
  entity: RuntimeEntity,
  segments: string[],
): number => {
  if (segments[0] !== "state" || segments.length < 2) return 0;
  const isValuePath =
    segments.length === 2 || (segments.length === 3 && segments[2] === "value");
  if (!isValuePath) return 0;
  const key = segments[1];
  const val = entity.ledger?.incoming?.[key];
  return typeof val === "number" ? val : 0;
};
