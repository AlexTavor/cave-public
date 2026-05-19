import styled from "@emotion/styled";

export const DesignerRoot = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 0 16px 16px;
`;

export const AddAbilityRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

export const EmptyState = styled.div`
    color: ${({ theme }) => theme.colors.secondary};
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: 12px;
`;
