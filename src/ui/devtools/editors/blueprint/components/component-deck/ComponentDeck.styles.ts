import styled from "@emotion/styled";

export const Deck = styled.div`
    padding: 0 16px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const AddRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
    padding-top: 6px;
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
