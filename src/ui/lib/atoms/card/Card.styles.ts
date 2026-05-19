import styled from "@emotion/styled";

export const CardContainer = styled.div<{
    padding: string;
    interactive: boolean;
}>`
    position: relative;
    padding: ${({ padding }) => padding};
    cursor: ${({ interactive }) => (interactive ? "pointer" : "default")};
    transition:
        width 0.3s ease,
        height 0.3s ease,
        padding 0.3s ease;
`;

export const CardBackground = styled.div<{
    background: string;
    interactive: boolean;
    borderRadius: string;
    borderColor: string;
    hoverBorderColor: string;
}>`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${({ background }) => background};
    border-radius: ${({ borderRadius }) => borderRadius};
    border: ${({ theme, borderColor }) =>
        `${theme.borderWidth.thin} solid ${borderColor}`};
    filter: url(#organic-edge);
    transition: border-color 0.2s ease;
    z-index: -1;

    ${({ interactive, hoverBorderColor }) =>
        interactive &&
        `
        ${CardContainer}:hover & {
            border-color: ${hoverBorderColor};
        }
    `}
`;
