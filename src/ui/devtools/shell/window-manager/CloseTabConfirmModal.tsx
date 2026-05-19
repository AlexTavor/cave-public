import React from "react";
import { Modal } from "../../../lib/atoms/modal";
import { Button } from "../../../lib/atoms/button";
import type { TabGuard } from "../../state/tabGuardStore";

export interface CloseTabConfirmModalProps {
    tabId: string | null;
    getGuard: (tabId: string) => TabGuard | null;
    onClose: () => void;
    closeTab: (tabId: string) => void;
}

export const CloseTabConfirmModal: React.FC<CloseTabConfirmModalProps> = ({
    tabId,
    getGuard,
    onClose,
    closeTab,
}) => {
    const guard = tabId ? getGuard(tabId) : null;
    const title = guard?.title || "this tab";

    return (
        <Modal isOpen={!!tabId} onClose={onClose}>
            {(() => {
                if (!tabId) return null;

                return (
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
                            Save changes to {title}?
                        </div>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 8,
                            }}
                        >
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={onClose}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    guard?.discardChanges?.();
                                    onClose();
                                    closeTab(tabId);
                                }}
                            >
                                Discard
                            </Button>
                            <Button
                                size="sm"
                                variant="primary"
                                onClick={async () => {
                                    try {
                                        await guard?.requestSave?.();
                                        onClose();
                                        closeTab(tabId);
                                    } catch {
                                        // Save failure is surfaced by the editor; keep modal open.
                                    }
                                }}
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                );
            })()}
        </Modal>
    );
};
