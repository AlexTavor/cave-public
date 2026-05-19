import styled from "@emotion/styled";

export const ActionContent = styled.div`
    display: block;
    width: 100%;
    text-align: left;
    scale: 1;
    transition: scale 250ms ease;
    &:hover {
        scale: 1.1;
    }
`;

export const ActionLabel = styled.div<{ $tone: "primary" | "default" }>`
    font-size: 1.35rem;
    font-weight: 700;
    color: ${({ theme, $tone }) =>
        $tone === "primary" ? theme.colors.buttonSelected : theme.colors.text};
`;

export const ActionDescription = styled.p`
    margin: ${({ theme }) => theme.spacing.xs} 0 0;
    color: ${({ theme }) => theme.colors.secondary};
    opacity: 0.8;
`;
