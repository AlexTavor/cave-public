import React from "react";
import styled from "@emotion/styled";
import { GameIcon } from "../../../lib/atoms/game-icon/GameIcon";
import { useUiAvatarUrl } from "./useUiAvatarUrl";

const AvatarFrame = styled.div<{ px: number }>`
    position: relative;
    width: ${({ px }) => `${px}px`};
    height: ${({ px }) => `${px}px`};
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
`;

const AvatarLayer = styled.img`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
`;

const SIZE_PX = { sm: 32, md: 48, lg: 64 } as const;

export const UiAvatar: React.FC<{
    subjectId: string | undefined;
    fallbackIconId?: string;
    size?: "sm" | "md" | "lg";
}> = ({ subjectId, fallbackIconId, size = "md" }) => {
    const avatar = useUiAvatarUrl(subjectId);
    const iconId = fallbackIconId ?? avatar.fallbackIconId ?? "unknown";
    if (avatar.status === "ready" && avatar.url) {
        return (
            <AvatarFrame px={SIZE_PX[size]}>
                <AvatarLayer alt="" src={avatar.url} />
            </AvatarFrame>
        );
    }
    return (
        <AvatarFrame px={SIZE_PX[size]}>
            <GameIcon id={iconId} size={size} />
        </AvatarFrame>
    );
};
