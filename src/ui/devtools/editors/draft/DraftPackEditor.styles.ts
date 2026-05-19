import styled from "@emotion/styled";

export const DashboardGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: ${({ theme }) => theme.spacing.md};
    padding: ${({ theme }) => theme.spacing.md};
`;

export const CardTitle = styled.h3`
    margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
    font-size: ${({ theme }) => theme.fontSize.md};
    color: ${({ theme }) => theme.colors.text};
    position: relative;
`;

export const CardDescription = styled.p`
    margin: 0;
    font-size: ${({ theme }) => theme.fontSize.sm};
    color: ${({ theme }) => theme.colors.secondary};
    position: relative;
`;
