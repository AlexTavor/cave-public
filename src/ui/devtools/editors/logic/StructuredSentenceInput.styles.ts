import styled from "@emotion/styled";

export const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.xs};
`;

export const TokenRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${({ theme }) => theme.spacing.xs};
    padding: ${({ theme }) => theme.spacing.xs};
    border: 1px solid ${({ theme }) => theme.colors.whiteBorderSubtle};
    border-radius: ${({ theme }) => theme.radius.sm};
    background: ${({ theme }) => theme.colors.surface};
`;

export const TokenPill = styled.span<{
    tone: "keyword" | "op" | "value" | "ref" | "global";
}>`
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.xs};
    padding: 2px ${({ theme }) => theme.spacing.sm};
    border-radius: ${({ theme }) => theme.radius.pill};
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: ${({ theme }) => theme.fontSize.sm};
    border: 1px solid ${({ theme }) => theme.colors.whiteBorderSubtle};
    background: ${({ theme, tone }) => {
        if (tone === "global") return theme.colors.severity.warning.bg;
        if (tone === "keyword") return theme.colors.severity.info.bg;
        if (tone === "op") return theme.colors.surfaceHighlight;
        if (tone === "value") return theme.colors.surfaceHighlight;
        return theme.colors.surface;
    }};
    color: ${({ theme }) => theme.colors.text};
`;

export const InputRow = styled.div`
    display: flex;
    gap: ${({ theme }) => theme.spacing.xs};
    align-items: center;
`;

export const TokenInput = styled.input`
    flex: 1;
    padding: ${({ theme }) => theme.spacing.xs}
        ${({ theme }) => theme.spacing.sm};
    border-radius: ${({ theme }) => theme.radius.sm};
    border: 1px solid ${({ theme }) => theme.colors.whiteBorderSubtle};
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.code};
`;

export const HelperText = styled.div`
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: ${({ theme }) => theme.fontSize.xs};
    color: ${({ theme }) => theme.colors.secondary};
`;
