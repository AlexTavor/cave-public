import { Button } from "../../../../../lib/atoms/button";
import { Modal } from "../../../../../lib/atoms/modal";
import { ModalBody, ModalTitle } from "../../editor/BlueprintEditor.styles";
import { useEjectBlueprint } from "./useEjectBlueprint";

export const EjectButton = () => {
    const { isOpen, open, close, confirm, canEject } = useEjectBlueprint();

    return (
        <>
            <Button
                size="sm"
                variant="danger"
                disabled={!canEject}
                onClick={open}
            >
                Eject
            </Button>
            <Modal isOpen={isOpen} onClose={close}>
                <ModalBody>
                    <ModalTitle>Eject Blueprint</ModalTitle>
                    <div>
                        This removes designer controls and leaves raw ECS
                        components. Undo is required to revert.
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <Button size="sm" variant="ghost" onClick={close}>
                            Cancel
                        </Button>
                        <Button size="sm" variant="danger" onClick={confirm}>
                            Eject
                        </Button>
                    </div>
                </ModalBody>
            </Modal>
        </>
    );
};
