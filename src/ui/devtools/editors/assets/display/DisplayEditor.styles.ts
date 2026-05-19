import styled from "@emotion/styled";

export const SectionStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.md};
`;

export const NoteSurface = styled.div`
    padding: ${({ theme }) => theme.spacing.sm};
    border-radius: ${({ theme }) => theme.radius.sm};
    background: ${({ theme }) => theme.colors.surface};
    border: ${({ theme }) =>
        `${theme.borderWidth.thin} solid ${theme.colors.whiteBorderSubtle}`};
    color: ${({ theme }) => theme.colors.secondary};
    font-family: monospace;
    font-size: 12px;
`;

export const ActionRow = styled.div`
    display: flex;
    gap: ${({ theme }) => theme.spacing.xs};
    flex-wrap: wrap;
`;

export const SectionLabel = styled.div`
    font-size: 12px;
    color: ${({ theme }) => theme.colors.secondary};
    font-family: monospace;
`;

export const ErrorText = styled.div`
    color: ${({ theme }) => theme.colors.danger};
    font-size: 12px;
    font-family: monospace;
`;
