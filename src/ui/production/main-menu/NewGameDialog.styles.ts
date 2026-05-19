import styled from "@emotion/styled";

export const DialogBody = styled.div`
    display: grid;
    gap: 16px;
    max-width: 30rem;
`;

export const DialogTitle = styled.h2`
    margin: 0;
`;

export const DialogText = styled.p`
    margin: 0;
    color: ${({ theme }) => theme.colors.secondary};
    line-height: 1.5;
`;

export const ButtonRow = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 12px;
`;
