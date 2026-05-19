import styled from "@emotion/styled";

export const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

export const Title = styled.div`
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: 14px;
    font-weight: 700;
`;

export const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

export const Label = styled.div`
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: 12px;
    color: ${({ theme }) => theme.colors.secondary};
`;

export const Input = styled.input`
    height: 34px;
    padding: 0 10px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(0, 0, 0, 0.25);
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: 12px;
    outline: none;

    &:focus {
        border-color: rgba(255, 255, 255, 0.22);
    }
`;

export const TextArea = styled.textarea`
    min-height: 80px;
    padding: 10px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(0, 0, 0, 0.25);
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: 12px;
    outline: none;
    resize: vertical;

    &:focus {
        border-color: rgba(255, 255, 255, 0.22);
    }
`;

export const Select = styled.select`
    height: 34px;
    padding: 0 10px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(0, 0, 0, 0.25);
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: 12px;
    outline: none;
`;

export const Row = styled.div`
    display: flex;
    gap: 10px;
    align-items: center;
`;

export const ErrorText = styled.div`
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: 12px;
    color: #ff6666;
    white-space: pre-wrap;
`;
