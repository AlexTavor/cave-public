import { makeTransferCtx } from "./TransferDisplayModule.testUtils";

export const makeTransferCtxWithOverlayBounds = (
    ...args: Parameters<typeof makeTransferCtx>
) =>
    makeTransferCtx(...args) as ReturnType<typeof makeTransferCtx> & {
        ctx: { scratch: { nodeOverlayDisplayBounds: unknown } };
    };
