import React from "react";
import { RichText } from "../../../../lib/atoms/rich-text/RichText";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import { StatGroupTitle } from "../SelectionCard.styles";
import type { HabitiDisplayEntry } from "../../../../../game/habiti/resolveHabitiDisplayEntries";
import {
    HabitiGroup,
    HabitiPill,
    HabitiPillWrap,
    HabitiSummary,
    TooltipBody,
} from "./HabitiList.styles";

type HabitiListProps = {
    items: HabitiDisplayEntry[];
    title?: string;
    showAllGold?: boolean;
};

export const HabitiList: React.FC<HabitiListProps> = ({
    items,
    title = "Lifetime Experiences (Habiti)",
    showAllGold = false,
}) => {
    if (items.length === 0) return null;
    const renderTooltip = (item: HabitiDisplayEntry) => {
        if (!item.description && item.effectDescriptions.length === 0)
            return null;
        return (
            <TooltipBody>
                {item.description ? <RichText text={item.description} /> : null}
                {item.effectDescriptions.map((line) => (
                    <RichText key={`${item.id}:${line}`} text={line} />
                ))}
            </TooltipBody>
        );
    };
    return (
        <HabitiGroup>
            <StatGroupTitle>{title}</StatGroupTitle>
            <HabitiPillWrap>
                {items.map((item) => {
                    const pill = (
                        <HabitiPill
                            key={item.id}
                            isOwnedByCave={item.isOwnedByCave}
                            showAllGold={showAllGold}
                        >
                            <span>{item.label}</span>
                            {item.summary ? (
                                <HabitiSummary>{item.summary}</HabitiSummary>
                            ) : null}
                        </HabitiPill>
                    );
                    const tooltip = renderTooltip(item);
                    return tooltip ? (
                        <SmartTooltip key={item.id} content={tooltip}>
                            {pill}
                        </SmartTooltip>
                    ) : (
                        pill
                    );
                })}
            </HabitiPillWrap>
        </HabitiGroup>
    );
};
