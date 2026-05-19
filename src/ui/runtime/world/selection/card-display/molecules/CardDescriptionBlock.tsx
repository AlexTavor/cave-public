import React from "react";
import styled from "@emotion/styled";
import { RichText } from "../../../../../lib/atoms/rich-text/RichText";
import type {
    CardDescriptionModel,
    CardDisplayActionHandler,
} from "../cardDisplayTypes";
import { wrapDisplaySurface } from "../wrapDisplaySurface";

const DescriptionSurface = styled.div<{ maxLines?: number }>`
    ${({ maxLines }) =>
        maxLines
            ? `display: -webkit-box; overflow: hidden; -webkit-line-clamp: ${maxLines}; -webkit-box-orient: vertical;`
            : ""}
    text-align:center;
`;

type Props = {
    description?: CardDescriptionModel;
    model?: CardDescriptionModel;
    onAction?: CardDisplayActionHandler;
};

export const CardDescriptionBlock: React.FC<Props> = ({
    description,
    model,
    onAction,
}) => {
    const resolved = model ?? description;
    if (!resolved) return null;
    return wrapDisplaySurface({
        action: resolved.action,
        onAction,
        tooltip: resolved.tooltip,
        children: (
            <DescriptionSurface maxLines={resolved.maxLines}>
                <RichText
                    variant={resolved.variant ?? "narration"}
                    text={resolved.text}
                />
            </DescriptionSurface>
        ),
    });
};
