import React from "react";
import { Modal } from "../../../../../lib/atoms/modal";
import { Button } from "../../../../../lib/atoms/button";
import { useDeleteModal } from "./useDeleteModal";
import {
    EmptyState,
    Footer,
    ImpactItem,
    ImpactList,
    ItemLabel,
    ItemPath,
    WarningText,
} from "./DeleteModal.styles";
import { ModalBody, ModalTitle } from "../../editor/BlueprintEditor.styles";

export const DeleteModal: React.FC = () => {
    const { isOpen, deleteImpact, close, confirmDelete, handleOpenFile } =
        useDeleteModal();

    return (
        <Modal isOpen={isOpen} onClose={close}>
            <ModalBody>
                <ModalTitle>Delete</ModalTitle>
                {deleteImpact.length ? (
                    <ImpactList>
                        <WarningText>This entity is referenced by:</WarningText>
                        {deleteImpact.map((i) => (
                            <ImpactItem key={`${i.fromId}:${i.path}`}>
                                <div style={{ minWidth: 0 }}>
                                    <ItemLabel
                                        title={`${i.fromLabel} (${i.fromId})`}
                                    >
                                        {i.fromLabel} ({i.fromId})
                                    </ItemLabel>
                                    <ItemPath title={i.path}>{i.path}</ItemPath>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleOpenFile(i.fromId)}
                                >
                                    Open
                                </Button>
                            </ImpactItem>
                        ))}
                    </ImpactList>
                ) : (
                    <EmptyState>No incoming references detected.</EmptyState>
                )}

                <Footer>
                    <Button size="sm" variant="ghost" onClick={close}>
                        Cancel
                    </Button>
                    <Button size="sm" variant="primary" onClick={confirmDelete}>
                        {deleteImpact.length ? "Force Delete" : "Delete"}
                    </Button>
                </Footer>
            </ModalBody>
        </Modal>
    );
};
