import { Modal } from "../../lib/atoms/modal/Modal";
import { ModalGuidanceDisplay } from "./ModalGuidanceDisplay";
import { useActiveRuntimeModalGuidance } from "./useActiveRuntimeModalGuidance";

export const RuntimeModalGuidanceOverlay = () => {
    const guidance = useActiveRuntimeModalGuidance();

    return (
        <Modal isOpen={guidance != null}>
            {guidance ? (
                <ModalGuidanceDisplay
                    title={guidance.title}
                    text={guidance.text}
                    imageUrl={guidance.imageUrl}
                    onContinue={guidance.continue}
                />
            ) : null}
        </Modal>
    );
};
