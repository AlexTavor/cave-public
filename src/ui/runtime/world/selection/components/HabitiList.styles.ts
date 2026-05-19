import styled from "@emotion/styled";

export const HabitiGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm};
`;

export const HabitiPillWrap = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${({ theme }) => theme.spacing.sm};
`;

export const HabitiPill = styled.div<{
    isOwnedByCave: boolean;
    showAllGold?: boolean;
}>`
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.xs};
    padding: ${({ theme }) => theme.spacing.xs}
        ${({ theme }) => theme.spacing.sm};
    border-radius: ${({ theme }) => theme.radius.pill};
    border: 1px solid ${({ theme }) => theme.colors.whiteBorderSubtle};
    color: ${({ isOwnedByCave, showAllGold, theme }) =>
        showAllGold || !isOwnedByCave
            ? theme.colors.xp
            : theme.colors.secondary};
`;

export const HabitiSummary = styled.span`
    color: ${({ theme }) => theme.colors.secondary};
    font-size: ${({ theme }) => theme.fontSize.md};
`;

export const TooltipBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.xs};
    max-width: 260px;
`;
