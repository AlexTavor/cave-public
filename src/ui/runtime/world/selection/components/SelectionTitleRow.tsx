import type React from "react";
import { PASSPORT_PERMANENT_TAG } from "../../../../../data/schemas/abilities/passport";
import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import { PermanentBadge, TitleRow } from "./SelectionTitleRow.styles";

type SelectionTitleRowProps = Readonly<{
    title: React.ReactNode;
    runtime: Runtime | null;
    entity?: RuntimeEntity | null;
    entityId?: string;
}>;

const isPermanent = (entity: RuntimeEntity | null | undefined) =>
    entity?.tags?.includes(PASSPORT_PERMANENT_TAG) ?? false;

export function SelectionTitleRow({
    title,
    runtime,
    entity,
    entityId,
}: SelectionTitleRowProps): React.JSX.Element {
    const resolved = entity ?? (entityId ? runtime?.getEntity(entityId) : null);
    return (
        <TitleRow data-testid="selection-title-row">
            {title}
            {isPermanent(resolved) ? (
                <PermanentBadge>Permanent</PermanentBadge>
            ) : null}
        </TitleRow>
    );
}
