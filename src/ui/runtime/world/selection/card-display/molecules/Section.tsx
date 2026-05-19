import React from "react";
import { SectionTitleText } from "../atoms/CardDisplayText.styles";
import type {
    CardDisplayActionHandler,
    CardDisplayCustomSlots,
    CardSectionModel,
} from "../cardDisplayTypes";
import { wrapDisplaySurface } from "../wrapDisplaySurface";
import { ValueRail } from "./ValueRail";

const resolveSlotContent = (
    section: CardSectionModel,
    customSlots?: CardDisplayCustomSlots,
) => {
    if (!section.customContentKind) return undefined;
    const content = customSlots?.[section.customContentKind];
    if (content) return content;
    if (customSlots)
        console.error(`Missing custom slot: ${section.customContentKind}`);
    return undefined;
};

export const Section: React.FC<{
    section: CardSectionModel;
    customSlots?: CardDisplayCustomSlots;
    onAction?: CardDisplayActionHandler;
}> = ({ section, customSlots, onAction }) => {
    const slotContent = resolveSlotContent(section, customSlots);
    if (!section.title && !section.capsules?.length && !slotContent)
        return null;
    return (
        <div>
            {section.title
                ? wrapDisplaySurface({
                      action: section.action,
                      onAction,
                      tooltip: section.tooltip,
                      children: (
                          <SectionTitleText id={`section-title-${section.id}`}>
                              {section.title}
                          </SectionTitleText>
                      ),
                  })
                : null}
            {section.capsules?.length ? (
                <ValueRail
                    capsules={section.capsules}
                    layout={section.layout}
                    density={section.density}
                    onAction={onAction}
                />
            ) : null}
            {slotContent}
        </div>
    );
};
