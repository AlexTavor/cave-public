import React, { useState } from "react";
import * as S from "./EditorItemWrapper.styles";

interface EditorItemWrapperProps {
    children?: React.ReactNode;
    onEdit?: () => void;
    onDelete?: () => void;
    onDuplicate?: () => void;
    isGhost?: boolean;
}

export const EditorItemWrapper: React.FC<EditorItemWrapperProps> = ({
    children,
    onEdit,
    onDelete,
    onDuplicate,
    isGhost,
}) => {
    const [isHovered, setIsHovered] = useState(false);

    if (isGhost) {
        return (
            <S.WrapperContainer isGhost onClick={onEdit} title="Add New Item">
                <S.GhostContent>+</S.GhostContent>
            </S.WrapperContainer>
        );
    }

    return (
        <S.WrapperContainer
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onEdit}
        >
            {children}
            {isHovered && (
                <>
                    <S.Overlay>
                        <S.EditLabel>EDIT</S.EditLabel>
                    </S.Overlay>

                    <S.ActionsContainer>
                        {onDuplicate && (
                            <S.ActionButton
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDuplicate();
                                }}
                                title="Duplicate"
                            >
                                ❐
                            </S.ActionButton>
                        )}
                        {onDelete && (
                            <S.ActionButton
                                variant="danger"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                }}
                                title="Delete"
                            >
                                ✕
                            </S.ActionButton>
                        )}
                    </S.ActionsContainer>
                </>
            )}
        </S.WrapperContainer>
    );
};
