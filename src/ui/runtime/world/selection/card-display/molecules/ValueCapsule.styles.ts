import styled from "@emotion/styled";

export const CapsuleColumn = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.xs};
`;

export const CapsuleRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.xs};
    flex-wrap: wrap;
`;

export const CapsuleMain = styled.div`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.xs};
    min-width: 0;
`;
