import type {
    EntityBarBinding,
    EntityTextBinding,
} from "../../entity-state-link/types";
import type {
    CardDescriptionModel,
    CardDisplayAction,
    CardTitleModel,
    TooltipModel,
} from "./cardDisplaySharedTypes";

export type {
    CardDescriptionModel,
    CardDisplayAction,
    CardDisplayActionHandler,
    CardDisplayCustomSlots,
    CardTitleModel,
    TooltipModel,
} from "./cardDisplaySharedTypes";

export type SkinStyle = {
    border: string;
    background: string;
    color: string;
};

export type CapsuleSkin =
    | "plain"
    | "value"
    | "modifier"
    | "ownedHabitus"
    | "unownedHabitus"
    | "caveOwned"
    | "warning"
    | "danger"
    | "success";

export type CardDisplayTone = "positive" | "negative" | "neutral";
export type CardSectionLayout = "row" | "wrap" | "column" | "grid";
export type CardSectionDensity = "tight" | "normal";
export type CardDisplayEmphasis =
    | "normal"
    | "muted"
    | "positive"
    | "warning"
    | "danger";

export type CapsuleValueModel =
    | { text: string; binding?: never; maxText?: string; ariaLabel?: string }
    | {
          binding: EntityTextBinding;
          text?: never;
          maxText?: string;
          ariaLabel?: string;
      };

export type CapsuleEffectSegmentModel = {
    id: string;
    text: string;
    tone: CardDisplayTone;
    sourceLabel?: string;
    targetKey?: string;
};

export type CapsuleProgressModel = EntityBarBinding & { color?: string };

export type ValueCapsuleModel = {
    id: string;
    skin: CapsuleSkin;
    iconId?: string;
    title?: string;
    value?: CapsuleValueModel;
    effects: CapsuleEffectSegmentModel[];
    suffix?: string;
    tooltip?: TooltipModel;
    action?: CardDisplayAction;
    progress?: CapsuleProgressModel;
    emphasis?: CardDisplayEmphasis;
    testId?: string;
};

export type CardSectionModel = {
    id: string;
    title?: string;
    tooltip?: TooltipModel;
    action?: CardDisplayAction;
    layout: CardSectionLayout;
    density: CardSectionDensity;
    capsules?: ValueCapsuleModel[];
    customContentKind?: string;
};

export type SelectionCardModel = {
    id: string;
    entityId: string;
    title?: CardTitleModel;
    badges?: ValueCapsuleModel[];
    conditionalNoticeEntityId?: string;
    sections: CardSectionModel[];
    description?: CardDescriptionModel;
    emptyText?: string;
};
