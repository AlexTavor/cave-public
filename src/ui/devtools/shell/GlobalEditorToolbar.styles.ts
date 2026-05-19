import styled from "@emotion/styled";

/**
 * Structural container for the toolbar.
 * Acts as the narrow top header for the editor window suite.
 */
export const ToolbarRoot = styled.div`
    width: 100%;
    height: fit-content;
    background: ${({ theme }) => theme.colors.background};
    border-bottom: 1px solid ${({ theme }) => theme.colors.whiteBorderSubtle};
    flex-shrink: 0;
    z-index: 20;
    pointer-events: auto; /* Ensure buttons are clickable despite container blocking */
`;

export const ToolbarSurface = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    padding: 8px 16px;
    width: 100%;
    box-sizing: border-box;
`;

export const FileMeta = styled.div`
    display: flex;
    flex: 1 1 240px;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

export const Filename = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: #f0f2ff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const PathLabel = styled.span`
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const StatusRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
`;

export const StatusPill = styled.span<{
    variant?: "dirty" | "clean" | "loading";
}>`
    border-radius: 999px;
    padding: 1px 8px;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
    background: ${({ variant }) => {
        switch (variant) {
            case "dirty":
                return "rgba(255, 115, 125, 0.18)";
            case "loading":
                return "rgba(255, 255, 255, 0.12)";
            default:
                return "rgba(102, 255, 204, 0.15)";
        }
    }};
    color: ${({ variant }) => {
        switch (variant) {
            case "dirty":
                return "#ff8a99";
            case "loading":
                return "rgba(255, 255, 255, 0.7)";
            default:
                return "#75ffd1";
        }
    }};
`;

export const ActionGroup = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex: 1 1 320px;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
`;

