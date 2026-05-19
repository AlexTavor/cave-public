import styled from "@emotion/styled";

export const MatrixContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm};
`;

export const MatrixHeader = styled.div`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.sm};
    font-size: ${({ theme }) => theme.fontSize.lg};
    color: ${({ theme }) => theme.colors.text};
`;

export const MatrixRow = styled.div`
    display: grid;
    grid-template-columns: auto auto 1fr auto;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.md};
`;

export const MatrixLabel = styled.span`
    font-size: ${({ theme }) => theme.fontSize.lg};
    color: ${({ theme }) => theme.colors.secondary};
`;

export const MatrixValue = styled.span`
    font-size: ${({ theme }) => theme.fontSize.lg};
    color: ${({ theme }) => theme.colors.text};
`;

export const ReservoirStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm};
`;

export const YieldContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm};
`;

export const YieldList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm};
`;

export const YieldRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.md};
`;

export const CountdownText = styled.div`
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: ${({ theme }) => theme.fontSize.lg};
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text};
`;
