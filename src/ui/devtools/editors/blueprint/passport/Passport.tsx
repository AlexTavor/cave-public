import React from "react";
import { usePassport } from "./usePassport";
import {
    DirtyTag,
    PassportCard,
    PassportId,
    PassportText,
    PassportTitle,
    PassportTop,
    StatusRow,
    Tag,
    TagsRow,
} from "./Passport.styles";
import { useBlueprintContext } from "../BlueprintContext";

export const Passport: React.FC = () => {
    const { filename, blueprintId } = useBlueprintContext();
    const state = usePassport(filename, blueprintId);

    if (!state) return null;

    return (
        <PassportCard
            padding="md"
            interactive
            variant="highlight"
            onClick={state.openIdentity}
        >
            <PassportTop>
                <PassportText>
                    <PassportTitle title={state.label}>
                        {state.label}
                    </PassportTitle>
                    <PassportId>{state.blueprintId}</PassportId>
                </PassportText>
                <StatusRow>
                    {state.isDirty && <DirtyTag>Dirty</DirtyTag>}
                </StatusRow>
            </PassportTop>

            <TagsRow>
                {state.tags.length ? (
                    state.tags.map((t: string) => <Tag key={t}>{t}</Tag>)
                ) : (
                    <Tag>No tags</Tag>
                )}
            </TagsRow>
        </PassportCard>
    );
};
