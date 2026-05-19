import React from "react";
import { Modal } from "../../../../../lib/atoms/modal";
import { Button } from "../../../../../lib/atoms/button";
import { useChangeIdModal } from "./useChangeIdModal";
import {
    Input,
    ModalBody,
    ModalTitle,
    FieldLabel,
} from "../../editor/BlueprintEditor.styles";
import { ErrorText, Footer } from "../identity-modal/IdentityModal.styles";

export const ChangeIdModal: React.FC = () => {
    const {
        isOpen,
        idDraft,
        setIdDraft,
        validationError,
        canConfirm,
        close,
        confirm,
    } = useChangeIdModal();

    return (
        <Modal isOpen={!!isOpen} onClose={close}>
            <ModalBody>
                <ModalTitle>Change Blueprint ID</ModalTitle>
                <div>
                    <FieldLabel>New ID</FieldLabel>
                    <Input
                        value={idDraft}
                        onChange={(e) => setIdDraft(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && confirm()}
                        placeholder="e.g. wooden_chest"
                    />
                    {validationError && (
                        <ErrorText>{validationError}</ErrorText>
                    )}
                </div>
                <Footer>
                    <Button size="sm" variant="ghost" onClick={close}>
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        variant="primary"
                        disabled={!canConfirm}
                        onClick={confirm}
                    >
                        Rename
                    </Button>
                </Footer>
            </ModalBody>
        </Modal>
    );
};
