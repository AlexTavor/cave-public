import React from "react";
import { FillBar } from "../../../../lib/atoms/fill-bar/FillBar";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import type { EntityTextBinding } from "../../entity-state-link";
import { useEntityBarRef, useEntityTextRef } from "../../entity-state-link";
import type { AbilityBarModel } from "./abilityDisplay.types";

const hasLiveValue = (
    model: AbilityBarModel,
): model is AbilityBarModel & { valueBinding: EntityTextBinding } =>
    "valueBinding" in model;

const LiveValue: React.FC<{ binding: EntityTextBinding }> = ({ binding }) => {
    const ref = useEntityTextRef<HTMLSpanElement>(binding);
    return <span ref={ref} />;
};

const renderValue = (model: AbilityBarModel) =>
    hasLiveValue(model) ? (
        <LiveValue binding={model.valueBinding} />
    ) : (
        model.valueText
    );

export const AbilityBarDisplay: React.FC<{
    model: AbilityBarModel;
    placement?: "top-start" | "left-start" | "right-start" | "bottom-start";
}> = ({ model, placement }) => {
    const fillRef = useEntityBarRef({
        id: model.id,
        entityId: model.entityId,
        valuePath: model.valuePath,
        ...(model.maxPath
            ? { maxPath: model.maxPath }
            : { maxValue: model.maxValue }),
    });

    return (
        <SmartTooltip
            placement={placement}
            content={
                <div>
                    <div>{model.tooltipTitle}</div>
                    {model.tooltipLines.map((line) => (
                        <div key={line}>{line}</div>
                    ))}
                </div>
            }
        >
            <div>
                <FillBar
                    current={model.current}
                    max={model.max}
                    color={model.color}
                    height={model.height ?? 6}
                    fillRef={fillRef}
                    icon={model.iconId}
                    title={
                        <>
                            <span>{model.title}</span>
                            {model.titleMetaText ? (
                                <span>{model.titleMetaText}</span>
                            ) : null}
                        </>
                    }
                    showValue
                    formatValue={() => renderValue(model)}
                />
            </div>
        </SmartTooltip>
    );
};
