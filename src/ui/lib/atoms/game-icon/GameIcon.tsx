import React from "react";
import { useResolvedDisplayIcon } from "../../foundation/icon-registry/useResolvedDisplayIcon";
import { GameIconProps } from "./types";
import { IconContainer } from "./GameIcon.styles";

export const GameIcon: React.FC<GameIconProps> = ({
    id,
    size = "md",
    className,
    ...rest
}) => {
    const icon = useResolvedDisplayIcon(id);
    const loading = useResolvedDisplayIcon(id === "loading" ? id : "loading");
    const unknown = useResolvedDisplayIcon(id === "unknown" ? id : "unknown");
    const url =
        icon.url ??
        (icon.status === "loading" ? loading.url : null) ??
        (id === "unknown" ? null : unknown.url);

    return (
        <IconContainer size={size} className={className} {...rest}>
            {url ? <img src={url} alt={id} /> : <span aria-label={id}>?</span>}
        </IconContainer>
    );
};

