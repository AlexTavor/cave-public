import styled from "@emotion/styled";
import { Button } from "../../lib/atoms/button";
import { RichText } from "../../lib/atoms/rich-text/RichText";

export const TutorialCard = styled.div`
    display: grid;
    gap: ${({ theme }) => theme.spacing.xl};
    max-width: 80vw;
`;

export const Title = styled(RichText)`
    justify-self: center;
    align-self: center;
    color: ${({ theme }) => theme.colors.xp};
    font-size: ${({ theme }) => theme.fontSize.xxl};
`;

export const ContinueButton = styled(Button)`
    justify-self: center;
    align-self: center;
    max-width: 50%;
    padding: ${({ theme }) => theme.spacing.lg}
        ${({ theme }) => theme.spacing.xl};
`;

export const TutorialImage = styled.img`
    width: 100%;
    border-radius: ${({ theme }) => theme.radius.md};
    border: ${({ theme }) => theme.borderWidth.thin} solid
        ${({ theme }) => theme.colors.whiteBorderMedium};
    max-width: 50vh;
    justify-self: center;
`;
