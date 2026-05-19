import { useEffect, type MouseEvent, type ReactNode } from "react";
import { Portal } from "../../foundation/portal-manager/Portal";
import { Backdrop, ModalContainer } from "./Modal.styles";
import { Animatable } from "../../atoms/animatable/Animatable";
import { AnimationType } from "../../atoms/animatable/types";

interface ModalProps {
    children: ReactNode;
    isOpen: boolean;
    onClose?: () => void;
    className?: string;
    /**
     * Animation type for the modal container.
     * @default "pop"
     */
    animationType?: AnimationType;
}

/**
 * A modal dialog that renders in the overlay portal layer with a backdrop.
 * Clicking the backdrop or pressing ESC will trigger onClose if provided.
 * The modal animates in/out using Animatable.
 */
export const Modal = ({
    children,
    isOpen,
    onClose,
    className,
    animationType = "pop",
}: ModalProps) => {
    useEffect(() => {
        if (!onClose) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        globalThis.addEventListener("keydown", handleEscape);
        return () => globalThis.removeEventListener("keydown", handleEscape);
    }, [onClose]);

    if (!isOpen) {
        return null;
    }

    return (
        <Portal layer="overlay">
            <Animatable type="fade" key="modal-backdrop">
                <Backdrop onClick={onClose}>
                    <Animatable
                        type={animationType}
                        onClick={(e: MouseEvent<HTMLDivElement>) =>
                            e.stopPropagation()
                        }
                    >
                        <ModalContainer className={className}>
                            {children}
                        </ModalContainer>
                    </Animatable>
                </Backdrop>
            </Animatable>
        </Portal>
    );
};

