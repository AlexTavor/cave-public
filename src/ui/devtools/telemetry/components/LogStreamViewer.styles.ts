import styled from "@emotion/styled";
import type { AppTheme } from "../../../lib/foundation/theme/types";

const getSeverityColor = (theme: AppTheme, severity: string) => {
    if (severity === "error") return theme.colors.error;
    if (severity === "warn") return theme.colors.severity.warning.text;
    return theme.colors.text;
};

export const ViewerContainer = styled.div`
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: ${({ theme }) => theme.spacing.sm};
`;

export const LogRow = styled.div<{ severity: string }>`
    display: flex;
    gap: ${({ theme }) => theme.spacing.sm};
    padding: ${({ theme }) => `${theme.spacing.xs} 0`};
    color: ${({ theme, severity }) => getSeverityColor(theme, severity)};
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: 12px;
`;

export const Timestamp = styled.span`
    opacity: 0.7;
`;

export const Message = styled.span`
    flex: 1;
`;

export const EmptyState = styled.div`
    padding: ${({ theme }) => theme.spacing.md};
    color: ${({ theme }) => theme.colors.secondary};
    font-style: italic;
`;
