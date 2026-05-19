import styled from "@emotion/styled";

export const EditorRoot = styled.div`
    width: 100%;
    height: 100%;
    background: ${({ theme }) => theme.colors.background};
`;

export const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

export const Label = styled.label`
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: 12px;
    color: ${({ theme }) => theme.colors.secondary};
`;

export const Input = styled.input`
    height: 34px;
    padding: 0 10px;
    border-radius: ${({ theme }) => theme.radius.sm};
    border: 1px solid ${({ theme }) => theme.colors.surfaceHighlight};
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.code};
`;

export const Select = styled.select`
    height: 34px;
    padding: 0 10px;
    border-radius: ${({ theme }) => theme.radius.sm};
    border: 1px solid ${({ theme }) => theme.colors.surfaceHighlight};
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.code};
`;

export const Row = styled.div`
    display: flex;
    gap: 8px;
    align-items: end;
`;
