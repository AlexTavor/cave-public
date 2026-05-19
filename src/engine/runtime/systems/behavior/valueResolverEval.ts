import type { BehaviorContext } from "./ValueResolver.types";
import type { ResolverToken } from "./valueResolverTokens";

type ResolveToken = (token: string, context: BehaviorContext) => number;

type PrecedenceMap = Record<string, number>;

const applyOperator = (op: string, left: number, right: number): number => {
  switch (op) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      return right === 0 ? 0 : left / right;
    default:
      return 0;
  }
};

const flushUntilParen = (stack: string[], output: string[]): void => {
  while (stack.length && stack.at(-1) !== "(") {
    output.push(stack.pop() as string);
  }
};

const shouldPop = (
  stack: string[],
  current: string,
  precedence: PrecedenceMap,
): boolean => {
  const last = stack.at(-1);
  if (!last || last === "(") return false;
  return precedence[last] >= precedence[current];
};

export const evaluateExpression = (
  tokens: ResolverToken[],
  context: BehaviorContext,
  resolveToken: ResolveToken,
): number => {
  const output: string[] = [];
  const stack: string[] = [];
  const precedence: PrecedenceMap = { "+": 1, "-": 1, "*": 2, "/": 2 };

  for (const token of tokens) {
    if (token.type === "literal") {
      output.push(token.value);
      continue;
    }

    if (token.value === "(") {
      stack.push(token.value);
      continue;
    }

    if (token.value === ")") {
      flushUntilParen(stack, output);
      stack.pop();
      continue;
    }

    const current = token.value;
    while (shouldPop(stack, current, precedence)) {
      output.push(stack.pop() as string);
    }
    stack.push(current);
  }

  while (stack.length) {
    output.push(stack.pop() as string);
  }

  const values: number[] = [];
  for (const token of output) {
    if (token in precedence) {
      const right = values.pop() ?? 0;
      const left = values.pop() ?? 0;
      values.push(applyOperator(token, left, right));
      continue;
    }
    values.push(resolveToken(token, context));
  }

  return values[0] ?? 0;
};
