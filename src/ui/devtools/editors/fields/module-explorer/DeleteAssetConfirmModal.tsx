import React, { useCallback } from "react";
import { Modal } from "../../../../lib/atoms/modal";
import { Button } from "../../../../lib/atoms/button";
import { useExplorerStore } from "./state/explorerStore";
import { useModuleStore } from "../../../state/moduleStore";
import { useSessionStore } from "../../../state/useSessionStore";
import { useTerminalStore } from "../../../state/useTerminalStore";
import { LogType } from "../../../../../lib/terminal";
import { ASSET_CATEGORY_DISPLAYS } from "../../../state/moduleStore.assets";

interface DeleteAssetConfirmModalProps {
    filename: string;
    sessionId: string;
}

export const DeleteAssetConfirmModal: React.FC<
    DeleteAssetConfirmModalProps
> = ({ filename, sessionId }) => {
    const session = useExplorerStore((s) => s.sessions[sessionId]);
    const { setPendingDeleteAssetId } = useExplorerStore((s) => s.actions);
    const deleteAssetFromModule = useModuleStore(
        (s) => s.deleteAssetFromModule,
    );
    const hasSession = useSessionStore((s) => Boolean(s.sessions[filename]));
    const updateDraft = useSessionStore((s) => s.updateDraft);
    const { addLog } = useTerminalStore();
    const log = (type: LogType, content: string) => addLog({ type, content });

    const pendingDeleteAssetId = session?.pendingDeleteAssetId;

    const onClose = () => setPendingDeleteAssetId(sessionId, null);

    const onConfirm = useCallback(async () => {
        if (!pendingDeleteAssetId) return;
        try {
            await deleteAssetFromModule({
                filename,
                category: ASSET_CATEGORY_DISPLAYS,
                assetId: pendingDeleteAssetId,
            });
            if (hasSession) {
                updateDraft(filename, (draft) => {
                    delete draft.assets.displays[pendingDeleteAssetId];
                });
            }
            log("success", `Deleted display '${pendingDeleteAssetId}'`);
        } catch (e: unknown) {
            log("error", "Delete failed: " + (e as Error).message);
        } finally {
            onClose();
        }
    }, [
        pendingDeleteAssetId,
        deleteAssetFromModule,
        filename,
        hasSession,
        log,
        onClose,
        updateDraft,
    ]);

    return (
        <Modal isOpen={!!pendingDeleteAssetId} onClose={onClose}>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                }}
            >
                <div
                    style={{
                        fontFamily: "monospace",
                        fontSize: 14,
                        fontWeight: 700,
                    }}
                >
                    Delete display {pendingDeleteAssetId}?
                </div>

                <div
                    style={{
                        fontFamily: "monospace",
                        fontSize: 12,
                        color: "#888",
                    }}
                >
                    This removes the display definition from this module.
                </div>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 8,
                    }}
                >
                    <Button size="sm" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button size="sm" variant="primary" onClick={onConfirm}>
                        Delete
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

