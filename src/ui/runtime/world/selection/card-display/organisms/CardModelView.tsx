import type { Runtime } from "../../../../../../engine/runtime/Runtime";
import { ConditionalActivationNotice } from "../../components/ConditionalActivationNotice";
import type {
    CardDisplayActionHandler,
    CardDisplayCustomSlots,
    CardSectionModel,
    SelectionCardModel,
} from "../cardDisplayTypes";
import { CardDescriptionBlock } from "../molecules/CardDescriptionBlock";
import { CardTitleBlock } from "../molecules/CardTitleBlock";
import { Section } from "../molecules/Section";
import { ValueRail } from "../molecules/ValueRail";
import { SelectionCardShell } from "./SelectionCardShell";
import { MutedText } from "../../SelectionCard.styles";

function hasVisibleSection(
    section: CardSectionModel,
    customSlots?: CardDisplayCustomSlots,
) {
    return !!(
        section.title ||
        section.capsules?.length ||
        (section.customContentKind && customSlots?.[section.customContentKind])
    );
}

type Props = Readonly<{
    model: SelectionCardModel | null;
    customSlots?: CardDisplayCustomSlots;
    onAction?: CardDisplayActionHandler;
    runtime: Runtime | null;
}>;

export function CardModelView({
    model,
    customSlots,
    onAction,
    runtime,
}: Props) {
    if (!model) return null;
    const visibleSections = model.sections.filter((section) =>
        hasVisibleSection(section, customSlots),
    );
    const title = model.title ? <CardTitleBlock title={model.title} /> : null;
    const badges = model.badges?.length ? (
        <ValueRail
            capsules={model.badges}
            layout="wrap"
            density="tight"
            onAction={onAction}
        />
    ) : null;
    const notice = model.conditionalNoticeEntityId ? (
        <ConditionalActivationNotice
            entityId={model.conditionalNoticeEntityId}
            runtime={runtime}
        />
    ) : null;
    const sections = visibleSections.map((section) => (
        <Section
            key={section.id}
            section={section}
            customSlots={customSlots}
            onAction={onAction}
        />
    ));
    const description = model.description ? (
        <CardDescriptionBlock
            description={model.description}
            onAction={onAction}
        />
    ) : null;
    const emptyState =
        model.emptyText &&
        visibleSections.length === 0 &&
        !model.description ? (
            <MutedText>{model.emptyText}</MutedText>
        ) : null;
    return (
        <SelectionCardShell>
            {title}
            {badges}
            {notice}
            {sections}
            {description}
            {emptyState}
        </SelectionCardShell>
    );
}
