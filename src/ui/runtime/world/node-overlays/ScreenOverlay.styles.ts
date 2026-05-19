import styled from "@emotion/styled";
import { CardShell } from "./NodeOverlayViewport.styles";

const SCREEN_CALLOUT_INSET_PX = 24;
const SCREEN_CALLOUT_MAX_WIDTH_PX = 320;
const SCREEN_CALLOUT_IMAGE_SIZE_PX = 36;

export type ScreenOverlaySlot =
    | "top_left"
    | "top_right"
    | "bottom_left"
    | "bottom_right"
    | "center";

export const ScreenOverlayRoot = styled.div`
    position: fixed;
    inset: 0;
    pointer-events: none;
`;

export const ScreenOverlaySlotCard = styled.div<{
    $slot: ScreenOverlaySlot;
}>`
    position: absolute;
    max-width: ${SCREEN_CALLOUT_MAX_WIDTH_PX}px;
    ${({ $slot }) =>
        $slot === "top_left"
            ? `top: ${SCREEN_CALLOUT_INSET_PX}px; left: ${SCREEN_CALLOUT_INSET_PX}px;`
            : ""}
    ${({ $slot }) =>
        $slot === "top_right"
            ? `top: ${SCREEN_CALLOUT_INSET_PX}px; right: ${SCREEN_CALLOUT_INSET_PX}px;`
            : ""}
    ${({ $slot }) =>
        $slot === "bottom_left"
            ? `bottom: ${SCREEN_CALLOUT_INSET_PX}px; left: ${SCREEN_CALLOUT_INSET_PX}px;`
            : ""}
    ${({ $slot }) =>
        $slot === "bottom_right"
            ? `right: ${SCREEN_CALLOUT_INSET_PX}px; bottom: ${SCREEN_CALLOUT_INSET_PX}px;`
            : ""}
    ${({ $slot }) =>
        $slot === "center"
            ? "top: 50%; left: 50%; transform: translate(-50%, -50%);"
            : ""}
`;

export const ScreenOverlayCardShell = styled(CardShell)``;

export const ScreenOverlayImage = styled.img`
    width: ${SCREEN_CALLOUT_IMAGE_SIZE_PX}px;
    height: ${SCREEN_CALLOUT_IMAGE_SIZE_PX}px;
`;
