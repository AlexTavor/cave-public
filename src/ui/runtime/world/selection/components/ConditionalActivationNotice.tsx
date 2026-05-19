import React from "react";
import styled from "@emotion/styled";
import type { Runtime } from "../../../../../engine/runtime/Runtime";
import { useRuntimeSelector } from "../../../hooks/useRuntimeSelector";
import { RichText } from "../../../../lib/atoms/rich-text/RichText";
import { resolveConditionalActivationExplanation } from "./resolveConditionalActivationExplanation";

const NoticeRoot = styled.div`
    padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
    border-left: ${({ theme }) =>
        `3px solid ${theme.colors.severity.warning.border}`};
    background: ${({ theme }) => theme.colors.severity.warning.bg};
    border-radius: ${({ theme }) => theme.radius.md};
`;

const ConditionalActivationNoticeInner: React.FC<{
    entityId: string;
    runtime: Runtime | null;
}> = ({ entityId, runtime }) => {
    const explanation = useRuntimeSelector(
        runtime,
        {
            entityIds: [entityId],
            includeEntityListRevision: false,
            includeBlueprintRevision: true,
        },
        () => resolveConditionalActivationExplanation(entityId, runtime),
    );
    if (!explanation) return null;
    return (
        <NoticeRoot data-testid="conditional-activation-notice">
            <RichText variant="narration" text={explanation} />
        </NoticeRoot>
    );
};

export const ConditionalActivationNotice: React.FC<{
    entityId: string;
    runtime: Runtime | null;
}> = ({ entityId, runtime }) => {
    if (!entityId || !runtime?.getEntity(entityId)) return null;
    return (
        <ConditionalActivationNoticeInner
            entityId={entityId}
            runtime={runtime}
        />
    );
};
