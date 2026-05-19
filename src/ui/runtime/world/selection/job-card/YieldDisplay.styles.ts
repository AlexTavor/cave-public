import styled from "@emotion/styled";
import { MutedText } from "../SelectionCard.styles";

export const SectionTitle = styled(MutedText)`
    font-size: ${({ theme }) => theme.fontSize.sm};
    letter-spacing: 0.04em;
    text-transform: uppercase;
`;

export const SectionBlock = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.xs};
`;

