import React, { useCallback } from "react";
import { Modal } from "../../../../lib/atoms/modal";
import { Button } from "../../../../lib/atoms/button";
import { useExplorerStore } from "./state/explorerStore";
import { useModuleStore } from "../../../state/moduleStore";
import { useTerminalStore } from "../../../state/useTerminalStore";
import { LogType } from "../../../../../lib/terminal";

interface DeleteConfirmModalProps {
    filename: string;
    sessionId: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
    filename,
    sessionId,
}) => {
    const session = useExplorerStore((s) => s.sessions[sessionId]);
    const { closeDeleteBlueprint } = useExplorerStore((s) => s.actions);
    const deleteBlueprint = useModuleStore((s) => s.deleteBlueprint);
    const { addLog } = useTerminalStore();
    const log = (type: LogType, content: string) => addLog({ type, content });

    const pendingDeleteId = session?.pendingDeleteId;
    const deleteImpact = session?.deleteImpact || [];

    const onClose = () => closeDeleteBlueprint(sessionId);

    const onConfirm = useCallback(async () => {
        if (!pendingDeleteId) return;
        try {
            await deleteBlueprint({
                filename,
                blueprintId: pendingDeleteId,
            });
            log("success", `Deleted '${pendingDeleteId}'`);
        } catch (e: unknown) {
            log("error", "Delete failed: " + (e as Error).message);
        } finally {
            onClose();
        }
    }, [pendingDeleteId, deleteBlueprint, filename, log, onClose]);

    return (
        <Modal isOpen={!!pendingDeleteId} onClose={onClose}>
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
                    Delete {pendingDeleteId}?
                </div>

                {deleteImpact.length ? (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                        }}
                    >
                        <div
                            style={{
                                fontFamily: "monospace",
                                fontSize: 12,
                                color: "#ffcc66",
                            }}
                        >
                            This item is used by:
                        </div>
                        {deleteImpact.map((i) => (
                            <div key={`${i.fromId}:${i.path}`}>
                                <div
                                    style={{
                                        fontFamily: "monospace",
                                        fontSize: 12,
                                        fontWeight: 700,
                                    }}
                                >
                                    {i.fromLabel} ({i.fromId})
                                </div>
                                <div
                                    style={{
                                        fontFamily: "monospace",
                                        fontSize: 11,
                                        color: "#888",
                                    }}
                                >
                                    {i.path}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div
                        style={{
                            fontFamily: "monospace",
                            fontSize: 12,
                            color: "#888",
                        }}
                    >
                        No incoming references detected.
                    </div>
                )}

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
                        {deleteImpact.length ? "Force Delete" : "Delete"}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
