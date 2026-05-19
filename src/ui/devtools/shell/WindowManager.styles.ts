import styled from "@emotion/styled";

export const ShellOverlay = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10;
    pointer-events: none;
`;

/**
 * Vertical Flexbox container that houses the Toolbar and the Layout Surface.
 */
export const LayoutContainer = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    pointer-events: none;
    position: relative;
`;

export const LayoutSurface = styled.div`
    flex: 1;
    width: 100%;
    height: 100%;
    min-height: 0; /* Important for flex-grow to respect boundaries */
    pointer-events: auto;
    position: relative;

    .flexlayout__layout {
        --color-background: transparent;
        --color-tabset-background: transparent;
        --color-tabset-background-selected: transparent;
        --color-tabset-header-background: transparent;
        --color-tab-content: transparent;
        background-color: transparent;
    }

    .flexlayout__tabset_content:has([data-game-view]) {
        pointer-events: none;
    }
`;
