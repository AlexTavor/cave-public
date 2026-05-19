import styled from "@emotion/styled";

export const EffectsRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.sm};
    flex-wrap: wrap;
    justify-content: flex-start;
`;

export const EffectPillRoot = styled.div`
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.xs};
    padding: ${({ theme }) => theme.spacing.xs}
        ${({ theme }) => theme.spacing.sm};
    border-radius: ${({ theme }) => theme.radius.pill};
    border: ${({ theme }) => theme.borderWidth.thin} solid
        ${({ theme }) => theme.colors.whiteBorderSubtle};
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.surfaceHighlight};
`;

export const EffectPillValue = styled.span`
    font-size: ${({ theme }) => theme.fontSize.md};
    font-weight: 600;
`;

export const EffectTooltipBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.xs};
    max-width: ${({ theme }) => theme.sizes.bodyCardMax};
`;
