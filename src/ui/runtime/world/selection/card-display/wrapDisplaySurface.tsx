import React from "react";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import type {
    CardDisplayAction,
    CardDisplayActionHandler,
    TooltipModel,
} from "./cardDisplayTypes";
import { InteractiveFrame } from "./atoms/InteractiveFrame";
import { renderTooltipContent } from "./renderTooltipContent";

export const wrapDisplaySurface = (input: {
    action?: CardDisplayAction;
    children: React.ReactNode;
    className?: string;
    onAction?: CardDisplayActionHandler;
    tooltip?: TooltipModel;
}) => {
    const content = (
        <InteractiveFrame
            action={input.action}
            className={input.className}
            onAction={input.onAction}
        >
            {input.children}
        </InteractiveFrame>
    );
    const tooltip = renderTooltipContent(input.tooltip);
    return tooltip ? (
        <SmartTooltip content={tooltip}>{content}</SmartTooltip>
    ) : (
        content
    );
};
