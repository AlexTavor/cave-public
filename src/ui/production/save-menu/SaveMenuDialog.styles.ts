import styled from "@emotion/styled";

export const DialogBody = styled.div`
    display: grid;
    gap: 12px;
    min-width: min(560px, calc(100vw - 32px));
`;

export const DialogInput = styled.input`
    width: 100%;
    padding: 12px;
`;

export const SlotList = styled.div`
    display: grid;
    gap: 8px;
    max-height: 50vh;
    overflow: auto;
`;
