import type { ActionValue } from "../../../../data/schemas/behavior";
import { evaluateExpression } from "./valueResolverEval";
import { resolvePath, resolveToken } from "./valueResolverPath";
import { tokenizeExpression } from "./valueResolverTokens";
import type { BehaviorContext } from "./ValueResolver.types";
export type { BehaviorContext } from "./ValueResolver.types";

export class ValueResolver {
  public resolve(value: ActionValue, context: BehaviorContext): number {
    if (!Number.isNaN(Number(value))) return Number(value);
    if (typeof value !== "string" || value.length === 0) return 0;
    const trimmed = value.trim();
    if (!trimmed) return 0;
    const tokens = tokenizeExpression(trimmed);
    if (tokens.length === 1 && tokens[0]?.type === "literal") {
      return resolvePath(tokens[0].value, context);
    }
    return evaluateExpression(tokens, context, resolveToken);
  }
}
