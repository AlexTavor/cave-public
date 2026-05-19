import styled from "@emotion/styled";

export const TitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.sm};
    flex-wrap: wrap;
`;

export const PermanentBadge = styled.span`
    padding: 1px ${({ theme }) => theme.spacing.sm};
    border-radius: ${({ theme }) => theme.radius.pill};
    border: ${({ theme }) => theme.borderWidth.thin} solid
        ${({ theme }) => theme.colors.severity.info.border};
    background: ${({ theme }) => theme.colors.severity.info.bg};
    color: ${({ theme }) => theme.colors.severity.info.text};
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
`;
