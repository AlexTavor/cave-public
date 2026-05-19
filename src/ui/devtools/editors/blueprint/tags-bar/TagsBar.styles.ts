import styled from "@emotion/styled";

export const TagsBarRoot = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
`;

export const Tag = styled.button`
    all: unset;
    cursor: pointer;
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: 11px;
    color: ${({ theme }) => theme.colors.secondary};
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid ${({ theme }) => theme.colors.whiteBorderMedium};
    background: ${({ theme }) => theme.colors.surface};

    &:hover {
        border-color: ${({ theme }) => theme.colors.primary};
        color: ${({ theme }) => theme.colors.primary};
    }
`;

export const TagInput = styled.input`
    height: 22px;
    width: 80px;
    padding: 0 6px;
    border-radius: 999px;
    border: 1px solid ${({ theme }) => theme.colors.whiteBorderSubtle};
    background: transparent;
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: 11px;
    outline: none;

    &::placeholder {
        color: ${({ theme }) => theme.colors.secondary};
    }
`;
