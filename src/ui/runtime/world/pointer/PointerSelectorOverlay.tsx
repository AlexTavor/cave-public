import React from "react";
import { Modal } from "../../../lib/atoms/modal";
import type { Runtime } from "../../../../engine/runtime/Runtime";
import { RuntimeCommandType } from "../../../../engine/runtime/types";
import { useRuntimeSelector } from "../../hooks/useRuntimeSelector";
import { BodySelectorView } from "../selection/absorption/BodySelectorView";
import { resolvePointerSelectorPreview } from "./resolvePointerSelectorPreview";
import { usePointerBodySelector } from "./usePointerBodySelector";
import {
    closePointerSelector,
    readPointerSelectorState,
} from "./pointerSelectorState";

export const PointerSelectorOverlay: React.FC<{ runtime: Runtime | null }> = ({
    runtime,
}) => {
    const data = useRuntimeSelector(
        runtime,
        {
            entityIds: ["sys_pointer", "sys_world"],
            includeEntityListRevision: true,
            includeBlueprintRevision: false,
            includeMutationRevision: true,
        },
        readPointerSelectorState,
    );
    const targetEntity =
        runtime && (data?.targetId || data?.targetKind === "world")
            ? runtime.getEntity(data.targetId || "sys_world")
            : undefined;
    const controller = usePointerBodySelector(
        runtime,
        data?.candidateIds ?? [],
        data?.targetKind ?? "none",
        targetEntity ?? undefined,
    );
    const { candidateIds, preview, ...viewController } = controller;
    if (!runtime || !data?.isOpen) return null;
    const close = () => closePointerSelector(runtime);
    return (
        <Modal isOpen onClose={close}>
            <BodySelectorView
                runtime={runtime}
                candidateIds={candidateIds}
                onCancel={close}
                onConfirm={() => {
                    runtime.commands.enqueue({
                        type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
                        payload: {
                            updates: Array.from(controller.selectedIds).map(
                                (bodyId) => ({
                                    bodyId,
                                    ownerId: data.targetId || "sys_world",
                                }),
                            ),
                        },
                    });
                    close();
                }}
                {...viewController}
                preview={
                    preview ??
                    resolvePointerSelectorPreview({
                        runtime,
                        targetEntity,
                        targetKind: data?.targetKind ?? "none",
                        bodyEntities: [],
                    }).preview
                }
            />
        </Modal>
    );
};
