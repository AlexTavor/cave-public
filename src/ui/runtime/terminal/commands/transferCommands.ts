import { CommandDefinition, ExecutionContext, Suggestion } from "../../../../lib/terminal";
import { getCommandRuntime } from "../getCommandRuntime";
import { RuntimeCommandType } from "../../../../engine/runtime/types";
import {
    buildInvalidArgsResult,
    transferCancelSchema,
} from "../runtimeConstants";

type AutocompleteResult = Suggestion[];

const autocompleteEntityIds = (
    token: string,
    context: ExecutionContext,
): AutocompleteResult => {
    if (!context.runtime) return [];
    const ids = context.runtime.getActiveEntityIds();
    return ids
        .filter((id) => id.toLowerCase().startsWith(token))
        .map((id) => ({
            label: id,
            type: "value" as const,
            insertText: id,
        }));
};

const autocompleteResources = (
    args: string[],
    context: ExecutionContext,
): AutocompleteResult => {
    const token = args.at(-1)?.toLowerCase() ?? "";
    const sourceId = args[0];
    const runtime = getCommandRuntime(context);
    if (!runtime) return [];
    const sourceEntity = runtime.getEntities().find((e) => e.id === sourceId);
    if (!sourceEntity?.state) return [];
    const resources = Object.keys(sourceEntity.state as object);
    return resources
        .filter((r) => r.toLowerCase().startsWith(token))
        .map((r) => ({
            label: r,
            type: "value" as const,
            insertText: r,
            description: `Resource on ${sourceId}`,
        }));
};

type TransferAutocompleteHandler = (
    args: string[],
    context: ExecutionContext,
) => AutocompleteResult;

const transferStartAutocompleteHandlers: Partial<
    Record<number, TransferAutocompleteHandler>
> = {
    0: (args, context) =>
        autocompleteEntityIds(args.at(-1)?.toLowerCase() ?? "", context),
    1: (args, context) =>
        autocompleteEntityIds(args.at(-1)?.toLowerCase() ?? "", context),
    2: autocompleteResources,
};

export const transferStartCommand: CommandDefinition = {
    name: "transfer.start",
    description: "Start a transfer between entities",
    usage: "transfer.start <sourceId> <targetId> <resource> <amount>",
    execute: (args, context) => {
        // 1. Validate Argument Count
        if (args.length < 4) {
            return {
                type: "error",
                content:
                    "Missing arguments. Usage: transfer.start <source> <target> <resource> <amount>",
            };
        }

        const [sourceId, targetId, resource, amountRaw] = args;

        // 2. Validate Amount Syntax
        const amount = Number(amountRaw);
        if (Number.isNaN(amount)) {
            return {
                type: "error",
                content: `Invalid quantity '${amountRaw}'. Must be a number.`,
            };
        }
        if (amount <= 0) {
            return {
                type: "error",
                content: "Quantity must be positive.",
            };
        }

        // 3. Validate Runtime State
        const runtime = getCommandRuntime(context);
        if (!runtime) {
            return {
                type: "error",
                content: "Runtime not initialized. Run game.new first.",
            };
        }

        // 4. Validate Source & Resource Existence
        const sourceEntity = runtime
            .getEntities()
            .find((e) => e.id === sourceId);

        if (!sourceEntity) {
            return {
                type: "error",
                content: `Source entity '${sourceId}' not found.`,
            };
        }

        const state = (sourceEntity.state as Record<string, any>) ?? {};
        if (!Object.hasOwn(state, resource)) {
            return {
                type: "error",
                content: `Entity '${sourceId}' does not possess resource '${resource}'.`,
            };
        }

        // 5. Validate Sufficient Funds
        // We assume state structure is Record<string, { value: number }> based on engine schemas
        const currentAmount = state[resource]?.value;
        if (typeof currentAmount !== "number") {
            return {
                type: "error",
                content: `Resource '${resource}' on '${sourceId}' has invalid state.`,
            };
        }

        if (currentAmount < amount) {
            return {
                type: "error",
                content: `Insufficient funds. '${sourceId}' has ${currentAmount} ${resource}, requested ${amount}.`,
            };
        }

        // 6. Execute
        runtime.commands.enqueue({
            type: RuntimeCommandType.TRANSFER_ASSETS,
            payload: {
                sourceId,
                targetId,
                payload: {
                    [resource]: amount,
                },
            },
        });

        return {
            type: "success",
            content: `Transfer queued from '${sourceId}' to '${targetId}'.`,
        };
    },
    autocomplete: (args, context) => {
        if (!context.runtime) return [];
        const index = args.length - 1;
        const handler = transferStartAutocompleteHandlers[index];
        return handler ? handler(args, context) : [];
    },
};

export const transferCancelCommand: CommandDefinition = {
    name: "transfer.cancel",
    description: "Cancel transfers targeting an entity",
    usage: "transfer.cancel <targetId>",
    execute: (args, context) => {
        const parsed = transferCancelSchema.safeParse(args);
        if (!parsed.success) return buildInvalidArgsResult("transfer.cancel");

        const [targetId] = parsed.data;
        const runtime = getCommandRuntime(context);
        if (!runtime) {
            return {
                type: "error",
                content: "Runtime not initialized. Run game.new first.",
            };
        }

        runtime.commands.enqueue({
            type: RuntimeCommandType.CANCEL_TRANSFER,
            payload: {
                targetId,
            },
        });

        return {
            type: "success",
            content: `Cancel queued for transfers targeting '${targetId}'.`,
        };
    },
    autocomplete: (args, context) => {
        if (args.length === 1 && context.runtime) {
            const ids = context.runtime.getActiveEntityIds();
            const token = args[0].toLowerCase();
            return ids
                .filter((id) => id.toLowerCase().startsWith(token))
                .map((id) => ({
                    label: id,
                    type: "value" as const,
                    insertText: id,
                }));
        }
        return [];
    },
};
