import styled from "@emotion/styled";
import type { AbilityEffectTone } from "./abilityDisplay.types";

const resolveToneColor = (
    tone: AbilityEffectTone,
    colors: any,
    fallback: string,
) => {
    if (tone === "positive") return colors.success;
    if (tone === "negative") return colors.severity.danger.text;
    return fallback;
};

export const EffectList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm};
`;

export const EffectRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ theme }) => theme.spacing.md};
`;

export const HeaderLines = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.xs};
`;

export const HeaderLine = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px;
`;

export const EffectLabel = styled.span<{ tone: AbilityEffectTone }>`
    color: ${({ theme, tone }) =>
        resolveToneColor(tone, theme.colors, theme.colors.text)};
`;

export const EffectValue = styled.span<{ tone: AbilityEffectTone }>`
    font-family: ${({ theme }) => theme.fonts.code};
    color: ${({ theme, tone }) =>
        resolveToneColor(tone, theme.colors, theme.colors.secondary)};
`;
