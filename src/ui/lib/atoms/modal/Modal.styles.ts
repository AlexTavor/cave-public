import styled from "@emotion/styled";

export const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    background-color: ${({ theme }) => theme.colors.modal};
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: ${({ theme }) => theme.zIndices.modal};
    pointer-events: all;
`;

export const ModalContainer = styled.div`
    position: relative;
    height: fit-content;
    width: fit-content;
`;

