import styled from "@emotion/styled";

export const ToolbarGroup = styled.div`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.xs};
`;

export const ToolbarSpacer = styled.div`
    flex: 1;
`;

export const FormBody = styled.div`
    padding: ${({ theme }) => theme.spacing.md};
`;
