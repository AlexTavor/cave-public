import type { TooltipModel } from "./cardDisplayTypes";

export const renderTooltipContent = (tooltip?: TooltipModel) => {
    if (!tooltip) return null;
    if (tooltip.content) return tooltip.content;
    if (!tooltip.title && !tooltip.lines?.length) return null;
    return (
        <div>
            {tooltip.title ? <div>{tooltip.title}</div> : null}
            {tooltip.lines?.map((line) => (
                <div key={line}>{line}</div>
            ))}
        </div>
    );
};
