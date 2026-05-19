import type { EntityBarBinding, EntityTextBinding } from "../entity-state-link";

export type NodeOverlayKind = "cycle" | "assignment" | "storage";

export type CompactBarBinding = EntityBarBinding & {
    current: number;
    max: number;
    color?: string;
};

export interface ScreenPosition {
    x: number;
    y: number;
}

type StaticValueDisplay = { valueText: string; valueBinding?: never };

type LiveValueDisplay = { valueBinding: EntityTextBinding; valueText?: never };

type HiddenValueDisplay = { valueBinding?: never; valueText?: never };

type NodeOverlayBase = {
    entityId: string;
    kind: NodeOverlayKind;
    label: string;
    bar?: CompactBarBinding;
};

export type ResolvedNodeOverlayEntry = NodeOverlayBase &
    (HiddenValueDisplay | StaticValueDisplay | LiveValueDisplay);

export type ResolvedNodeOverlayModel = ResolvedNodeOverlayEntry & {
    position: ScreenPosition;
};

export interface FixedSlotModel {
    slotId: string;
    model: ResolvedNodeOverlayModel | null;
}
