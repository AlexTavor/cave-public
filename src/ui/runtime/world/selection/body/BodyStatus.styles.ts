import styled from "@emotion/styled";

export const BodyStatus = styled.div`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.xs};
`;

export const StatusIcon = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: ${({ theme }) => theme.colors.severity.warning.text};
`;

export const UnownedHabitiMarker = styled.span`
    display: inline-flex;
    min-width: 18px;
    justify-content: center;
    font-size: ${({ theme }) => theme.fontSize.sm};
    color: ${({ theme }) => theme.colors.severity.info.text};
`;
