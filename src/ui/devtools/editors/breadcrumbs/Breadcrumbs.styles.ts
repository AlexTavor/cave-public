import styled from "@emotion/styled";

export const BreadcrumbsContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: ${(props) => props.theme.colors.text};
`;

export const Crumb = styled.span<{ isLast?: boolean }>`
    cursor: ${(props) => (props.isLast ? "default" : "pointer")};
    opacity: ${(props) => (props.isLast ? 1 : 0.7)};
    font-weight: ${(props) => (props.isLast ? "bold" : "normal")};

    &:hover {
        opacity: 1;
        text-decoration: ${(props) => (props.isLast ? "none" : "underline")};
    }
`;

export const Separator = styled.span`
    opacity: 0.5;
`;
