import type { ReactNode } from "react";

export type CardDisplayAction = {
    id: string;
    label: string;
    kind: "callback" | "codex";
    callback?: () => void;
    entryId?: string;
    disabled?: boolean;
};

export type CardDisplayActionHandler = (action: CardDisplayAction) => void;

export type TooltipModel = {
    title?: string;
    lines?: string[];
    content?: ReactNode;
    placement?: "top-start" | "right-start" | "bottom-start" | "left-start";
};

export type CardAvatarModel = {
    subjectId: string | undefined;
    fallbackIconId?: string;
    size?: "sm" | "md" | "lg";
};

export type CardTitleModel = {
    id: string;
    avatar?: CardAvatarModel;
    iconId?: string;
    text: string;
    tooltip?: TooltipModel;
    action?: CardDisplayAction;
};

export type CardDescriptionModel = {
    id: string;
    text: string;
    variant?: "body" | "narration";
    tooltip?: TooltipModel;
    action?: CardDisplayAction;
    maxLines?: number;
};

export type CardDisplayCustomSlots = Record<string, ReactNode | undefined>;
