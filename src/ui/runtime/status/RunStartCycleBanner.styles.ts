import styled from "@emotion/styled";
import { CinematicText } from "../cinematic/Cinematic.styles";

export const RunStartCycleBannerAnchor = styled.div`
    position: absolute;
    top: 24px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    pointer-events: none;
    z-index: ${({ theme }) => theme.zIndices.float};
`;

export const RunStartCycleBannerText = styled(CinematicText)`
    width: auto;
    max-width: none;
    padding: 0;
`;
