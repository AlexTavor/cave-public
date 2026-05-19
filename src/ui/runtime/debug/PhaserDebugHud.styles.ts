import styled from "@emotion/styled";

export const HudRoot = styled.div`
    position: absolute;
    top: ${({ theme }) => theme.spacing.md};
    left: ${({ theme }) => theme.spacing.md};
    z-index: ${({ theme }) => theme.zIndices.float};
    width: min(360px, calc(100vw - 32px));
    pointer-events: none;
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm};
`;

export const HudCard = styled.div`
    padding: ${({ theme }) => theme.spacing.sm};
    background: rgba(0, 0, 0, 0.82);
    border: ${({ theme }) =>
        `${theme.borderWidth.thin} solid ${theme.colors.whiteBorderMedium}`};
    border-radius: ${({ theme }) => theme.radius.md};
    box-shadow: 0 8px 24px ${({ theme }) => theme.colors.blackShadow};
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.code};
`;

export const HudTitle = styled.div`
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    font-size: ${({ theme }) => theme.fontSize.sm};
    font-weight: 700;
`;

export const HudGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
`;

export const HudFact = styled.div`
    display: flex;
    justify-content: space-between;
    gap: ${({ theme }) => theme.spacing.sm};
    font-size: ${({ theme }) => theme.fontSize.xs};
`;

export const HudPoolList = styled.div`
    margin-top: ${({ theme }) => theme.spacing.sm};
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.xs};
    font-size: ${({ theme }) => theme.fontSize.xs};
`;

export const EmptyState = styled.div`
    font-size: ${({ theme }) => theme.fontSize.xs};
    color: ${({ theme }) => theme.colors.secondary};
`;
