import styled from "@emotion/styled";

export const LeverStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.md};
    height: 100%;
    min-height: 0;
`;

export const LeverScroll = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.md};
    overflow: auto;
    flex: 1;
    min-height: 0;
`;

export const FilterInput = styled.input`
    width: 100%;
    padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
    border-radius: ${({ theme }) => theme.radius.sm};
    border: 1px solid ${({ theme }) => theme.colors.surfaceHighlight};
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
`;

export const LeverGroup = styled.details`
    border-radius: ${({ theme }) => theme.radius.sm};
    border: 1px solid ${({ theme }) => theme.colors.surfaceHighlight};
    background: ${({ theme }) => theme.colors.background};
    padding: ${({ theme }) => theme.spacing.sm};
`;

export const LeverGroupTitle = styled.summary`
    cursor: pointer;
    font-weight: 600;
    list-style: none;
    margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

export const LeverSubGroup = styled.details`
    border-radius: ${({ theme }) => theme.radius.sm};
    border: 1px solid ${({ theme }) => theme.colors.surfaceHighlight};
    padding: ${({ theme }) => theme.spacing.sm};
    background: ${({ theme }) => theme.colors.surface};
`;

export const LeverSubGroupTitle = styled.summary`
    cursor: pointer;
    font-weight: 500;
    list-style: none;
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    color: ${({ theme }) => theme.colors.secondary};
`;

export const LeverRow = styled.div`
    display: grid;
    grid-template-columns: 1fr 120px auto;
    gap: ${({ theme }) => theme.spacing.sm};
    align-items: center;
    padding: ${({ theme }) => theme.spacing.xs} 0;
`;

export const LeverLabel = styled.div`
    font-size: ${({ theme }) => theme.fontSize.sm};
`;

export const LeverValueInput = styled.input`
    width: 100%;
    padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
    border-radius: ${({ theme }) => theme.radius.sm};
    border: 1px solid ${({ theme }) => theme.colors.surfaceHighlight};
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
`;

export const EmptyGroup = styled.div`
    font-size: ${({ theme }) => theme.fontSize.sm};
    color: ${({ theme }) => theme.colors.secondary};
`;
