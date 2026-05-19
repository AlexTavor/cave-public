import styled from "@emotion/styled";

export const SectionLabel = styled.div`
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: 12px;
    color: ${({ theme }) => theme.colors.secondary};
`;

export const Row = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: flex-start;
`;
