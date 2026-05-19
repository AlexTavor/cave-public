import type {
    CardSectionModel,
    SelectionCardModel,
    ValueCapsuleModel,
} from "./cardDisplayTypes";
import {
    actionEqual,
    descriptionEqual,
    effectEqual,
    listEqual,
    progressEqual,
    titleEqual,
    tooltipEqual,
    valueEqual,
} from "./cardDisplayEqualityHelpers";

export const valueCapsuleModelsEqual = (
    left: ValueCapsuleModel,
    right: ValueCapsuleModel,
) =>
    left.id === right.id &&
    left.skin === right.skin &&
    left.iconId === right.iconId &&
    left.title === right.title &&
    valueEqual(left.value, right.value) &&
    left.suffix === right.suffix &&
    left.testId === right.testId &&
    left.emphasis === right.emphasis &&
    tooltipEqual(left.tooltip, right.tooltip) &&
    actionEqual(left.action, right.action) &&
    listEqual(left.effects, right.effects, effectEqual) &&
    progressEqual(left.progress, right.progress);

export const cardSectionModelsEqual = (
    left: CardSectionModel,
    right: CardSectionModel,
) =>
    left.id === right.id &&
    left.title === right.title &&
    left.layout === right.layout &&
    left.density === right.density &&
    left.customContentKind === right.customContentKind &&
    actionEqual(left.action, right.action) &&
    tooltipEqual(left.tooltip, right.tooltip) &&
    listEqual(left.capsules, right.capsules, valueCapsuleModelsEqual);

export const selectionCardModelEqual = (
    left: SelectionCardModel | null,
    right: SelectionCardModel | null,
) =>
    left === right ||
    (!!left &&
        !!right &&
        left.id === right.id &&
        left.entityId === right.entityId &&
        titleEqual(left.title, right.title) &&
        listEqual(left.badges, right.badges, valueCapsuleModelsEqual) &&
        descriptionEqual(left.description, right.description) &&
        left.emptyText === right.emptyText &&
        left.conditionalNoticeEntityId === right.conditionalNoticeEntityId &&
        listEqual(left.sections, right.sections, cardSectionModelsEqual));
