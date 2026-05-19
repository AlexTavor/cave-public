import React from "react";
import type { EntityTextBinding } from "../entity-state-link";
import { useEntityBarRef, useEntityTextRef } from "../entity-state-link";
import { RichText } from "../../../lib/atoms/rich-text/RichText";
import { nodeOverlayCardRenderEqual } from "./nodeOverlayComparators";
import type {
    CompactBarBinding,
    ResolvedNodeOverlayModel,
} from "./nodeOverlayTypes";
import {
    CardShell,
    LabelText,
    OverlaySlot,
    ProgressFill,
    ProgressRow,
    ValueText,
} from "./NodeOverlayViewport.styles";

const NodeOverlayProgress: React.FC<{ binding: CompactBarBinding }> = ({
    binding,
}) => {
    const fillRef = useEntityBarRef(binding);
    const progress =
        binding.max <= 0
            ? 0
            : Math.min(100, (binding.current / binding.max) * 100);
    return (
        <ProgressRow>
            <ProgressFill
                ref={fillRef}
                data-progress={Math.max(progress, 0)}
                $color={binding.color}
                $progress={Math.max(progress, 0)}
            />
        </ProgressRow>
    );
};

const LiveValueText: React.FC<{
    binding: EntityTextBinding;
}> = ({ binding }) => {
    const ref = useEntityTextRef(binding);
    return <ValueText ref={ref} />;
};

const hasLiveValue = (
    model: ResolvedNodeOverlayModel,
): model is ResolvedNodeOverlayModel & { valueBinding: EntityTextBinding } =>
    "valueBinding" in model;

const hasStaticValue = (
    model: ResolvedNodeOverlayModel,
): model is ResolvedNodeOverlayModel & { valueText: string } =>
    "valueText" in model;

const NodeOverlayCardView: React.FC<{
    model: ResolvedNodeOverlayModel;
}> = ({ model }) => {
    const showLabel = model.label.trim().length > 0;
    let valueContent: React.ReactNode = null;
    if (hasLiveValue(model)) {
        valueContent = <LiveValueText binding={model.valueBinding} />;
    } else if (hasStaticValue(model)) {
        valueContent = <ValueText>{model.valueText}</ValueText>;
    }
    return (
        <OverlaySlot
            data-testid="node-overlay-slot"
            data-slot-id={model.entityId}
            $hidden={false}
            $x={model.position?.x ?? 0}
            $y={model.position?.y ?? 0}
        >
            <CardShell variant="transparent">
                {showLabel ? (
                    <LabelText>
                        <RichText text={model.label} />
                    </LabelText>
                ) : null}
                {valueContent}
                {model.bar ? <NodeOverlayProgress binding={model.bar} /> : null}
            </CardShell>
        </OverlaySlot>
    );
};

export const NodeOverlayCard = React.memo(NodeOverlayCardView, (left, right) =>
    nodeOverlayCardRenderEqual(left.model, right.model),
);
