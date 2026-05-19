import { useCallback } from "react";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import type { RuntimeEntity } from "../../../engine/runtime/types";
import { useWorldInteraction } from "./context/WorldInteractionContext";

type RuntimeEntityWithDisplay = RuntimeEntity & {
    id?: string;
    tags?: string[];
    transfer?: unknown;
};

interface TransferActions {
    handleCancelTransfer: (entity: RuntimeEntityWithDisplay) => void;
}

const isValidTransferTarget = (entity: RuntimeEntityWithDisplay): boolean => {
    if (!entity.id) return false;
    if (entity.transfer) return false;
    if (entity.tags?.includes("pending_transfer")) return false;
    return true;
};

export const useTransferActions = (): TransferActions => {
    const { runtime } = useWorldInteraction();
    const handleCancelTransfer = useCallback(
        (entity: RuntimeEntityWithDisplay) => {
            if (!isValidTransferTarget(entity)) return;
            const targetId = entity.id;
            if (!targetId) return;
            if (!runtime) return;

            runtime.commands.enqueue({
                type: RuntimeCommandType.CANCEL_TRANSFER,
                payload: {
                    targetId,
                },
            });
        },
        [],
    );

    return {
        handleCancelTransfer,
    };
};
