import { GameIcon } from "../../../../../lib/atoms/game-icon";
import type {
    CardDisplayActionHandler,
    ValueCapsuleModel,
} from "../cardDisplayTypes";
import { CapsuleFrame } from "../atoms/CapsuleFrame";
import { CapsuleMicrobar } from "../atoms/CapsuleMicrobar";
import {
    EffectText,
    MaxText,
    MutedText,
    ValueText,
} from "../atoms/CardDisplayText.styles";
import { wrapDisplaySurface } from "../wrapDisplaySurface";
import { LiveValueText } from "./LiveValueText";
import { CapsuleColumn, CapsuleMain, CapsuleRow } from "./ValueCapsule.styles";

const renderValue = (model: ValueCapsuleModel) => {
    if (!model.value) return null;
    const body =
        "binding" in model.value && model.value.binding ? (
            <LiveValueText
                binding={model.value.binding}
                ariaLabel={model.value.ariaLabel}
            />
        ) : (
            model.value.text
        );
    return (
        <ValueText aria-label={model.value.ariaLabel}>
            {body}
            {model.value.maxText ? (
                <MaxText>/{model.value.maxText}</MaxText>
            ) : null}
        </ValueText>
    );
};

type Props = Readonly<{
    model: ValueCapsuleModel;
    onAction?: CardDisplayActionHandler;
}>;

export function ValueCapsule({ model, onAction }: Props) {
    const content = (
        <CapsuleFrame skin={model.skin}>
            <CapsuleColumn data-testid={model.testId}>
                <CapsuleMain>
                    {model.iconId ? (
                        <GameIcon id={model.iconId} size="sm" />
                    ) : null}
                    {model.title ? <MutedText>{model.title}</MutedText> : null}
                    {renderValue(model)}
                    {model.effects.map((effect) => (
                        <EffectText key={effect.id} tone={effect.tone}>
                            {effect.text}
                        </EffectText>
                    ))}
                    {model.suffix ? (
                        <MutedText>{model.suffix}</MutedText>
                    ) : null}
                </CapsuleMain>
                {model.progress ? (
                    <CapsuleRow>
                        <CapsuleMicrobar progress={model.progress} />
                    </CapsuleRow>
                ) : null}
            </CapsuleColumn>
        </CapsuleFrame>
    );

    return wrapDisplaySurface({
        action: model.action,
        onAction,
        tooltip: model.tooltip,
        children: content,
    });
}
