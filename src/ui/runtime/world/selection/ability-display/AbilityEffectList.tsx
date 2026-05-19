import React from "react";
import { GameIcon } from "../../../../lib/atoms/game-icon";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import { SectionBlock, SectionTitle } from "../job-card/YieldDisplay.styles";
import type {
    AbilityEffectModel,
    AbilityInlineDisplayLine,
} from "./abilityDisplay.types";
import {
    EffectLabel,
    EffectList,
    EffectRow,
    EffectValue,
    HeaderLine,
    HeaderLines,
} from "./AbilityEffectList.styles";
import { RichText } from "../../../../lib/atoms/rich-text/RichText";

const renderTooltip = (title?: string, lines?: string[]) =>
    title || (lines?.length ?? 0) > 0 ? (
        <div>
            {title && <RichText text={title} variant="title" />}
            {lines?.map((line) => (
                <RichText key={line} text={line} />
            ))}
        </div>
    ) : null;

export const AbilityEffectList: React.FC<{
    title?: string;
    headerLines?: AbilityInlineDisplayLine[];
    effects: AbilityEffectModel[];
}> = ({ title, headerLines, effects }) => {
    if (effects.length === 0) return null;

    return (
        <SectionBlock>
            {title ? <SectionTitle>{title}</SectionTitle> : null}
            {headerLines?.length ? (
                <HeaderLines>
                    {headerLines.map((line) => {
                        const content = renderTooltip(
                            line.tooltipTitle,
                            line.tooltipLines,
                        );
                        const body = (
                            <HeaderLine>
                                {line.tokens.map((token, index) =>
                                    token.kind === "icon" ? (
                                        <GameIcon
                                            key={`${line.id}:${index}`}
                                            id={token.iconId ?? "unknown"}
                                            size="sm"
                                        />
                                    ) : (
                                        <span key={`${line.id}:${index}`}>
                                            {token.text}
                                        </span>
                                    ),
                                )}
                            </HeaderLine>
                        );
                        return content ? (
                            <SmartTooltip key={line.id} content={content}>
                                <div>{body}</div>
                            </SmartTooltip>
                        ) : (
                            <div key={line.id}>{body}</div>
                        );
                    })}
                </HeaderLines>
            ) : null}
            <EffectList>
                {effects.map((effect) => (
                    <SmartTooltip
                        key={effect.id}
                        content={renderTooltip(
                            effect.tooltipTitle,
                            effect.tooltipLines,
                        )}
                    >
                        <div>
                            <EffectRow>
                                <EffectLabel tone={effect.tone}>
                                    <GameIcon id={effect.iconId} size="sm" />{" "}
                                    {effect.label}
                                </EffectLabel>
                                <EffectValue tone={effect.tone}>
                                    {effect.valueText}
                                </EffectValue>
                            </EffectRow>
                        </div>
                    </SmartTooltip>
                ))}
            </EffectList>
        </SectionBlock>
    );
};
