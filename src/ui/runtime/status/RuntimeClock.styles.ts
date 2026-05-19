import styled from "@emotion/styled";
import {
    StatusReadout,
    StatusShellRight,
    StatusStrip,
} from "./RuntimeStatusStrip.styles";

export const ClockShell = styled(StatusShellRight)``;
export const ClockStrip = styled(StatusStrip)``;

export const ClockControls = styled.div`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.xs};
`;

export const ClockReadout = styled(StatusReadout)`
    font-variant-numeric: tabular-nums;
    min-width: 78px;
`;

