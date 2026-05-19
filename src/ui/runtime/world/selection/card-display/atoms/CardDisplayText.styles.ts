import styled from "@emotion/styled";

export const TitleText = styled.div`
    font-size: ${({ theme }) => theme.fontSize.lg};
    font-weight: 600;
`;

export const SectionTitleText = styled.div`
    font-size: ${({ theme }) => theme.fontSize.md};
    text-transform: capitalize;
    color: ${({ theme }) => theme.colors.text};
    padding-bottom: ${({ theme }) => theme.spacing.xs};
`;

export const DescriptionText = styled.div`
    color: ${({ theme }) => theme.colors.secondary};
    font-style: italic;
`;

export const ValueText = styled.span`
    font-size: ${({ theme }) => theme.fontSize.md};
`;

export const MaxText = styled.span`
    color: ${({ theme }) => theme.colors.secondary};
`;

export const EffectText = styled.span<{ tone?: string }>`
    color: ${({ theme, tone }) => {
        if (tone === "positive") return theme.colors.success;
        if (tone === "negative") return theme.colors.severity.danger.text;
        return theme.colors.secondary;
    }};
`;

export const MutedText = styled.span`
    color: ${({ theme }) => theme.colors.secondary};
    text-transform: capitalize;
`;
