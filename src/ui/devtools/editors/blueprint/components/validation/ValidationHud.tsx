import React from "react";
import styled from "@emotion/styled";
import { Card } from "../../../../../lib/atoms/card/Card";
import {
    Animatable,
    AnimatePresence,
} from "../../../../../lib/atoms/animatable/Animatable";
import type { ValidationIssue } from "../../../../../../engine/compiler/validation/collisionDetector";

interface ValidationHudProps {
    issues: ValidationIssue[];
}

const HudRoot = styled.div`
    position: absolute;
    right: 16px;
    bottom: 16px;
    z-index: ${({ theme }) => theme.zIndices.float};
    max-width: 320px;
`;

const HudFrame = styled.div`
    border-radius: ${({ theme }) => theme.radius.md};
    border: ${({ theme }) =>
        `${theme.borderWidth.thin} solid ${theme.colors.severity.danger.border}`};
    background: ${({ theme }) => theme.colors.severity.danger.bg};
`;

const HudTitle = styled.div`
    font-family: ${({ theme }) => theme.fonts.ui};
    font-weight: 700;
    font-size: 12px;
    margin-bottom: 8px;
`;

const IssueRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: flex-start;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text};
    user-select: text;

    & + & {
        margin-top: 6px;
    }
`;

const IssueIcon = styled.span<{ severity: "error" | "warning" }>`
    color: ${({ theme, severity }) =>
        severity === "error"
            ? theme.colors.severity.danger.text
            : theme.colors.severity.warning.text};
    font-weight: 700;
`;

export const ValidationHud: React.FC<ValidationHudProps> = ({ issues }) => {
    return (
        <HudRoot>
            <AnimatePresence>
                {issues.length > 0 ? (
                    <Animatable type="slideLeft" key="validation-hud">
                        <HudFrame>
                            <Card variant="surface" padding="sm">
                                <HudTitle>Validation</HudTitle>
                                {issues.map((issue) => (
                                    <IssueRow key={issue.id}>
                                        <IssueIcon severity={issue.severity}>
                                            {issue.severity === "error"
                                                ? "!"
                                                : "?"}
                                        </IssueIcon>
                                        <div>{issue.message}</div>
                                    </IssueRow>
                                ))}
                            </Card>
                        </HudFrame>
                    </Animatable>
                ) : null}
            </AnimatePresence>
        </HudRoot>
    );
};
