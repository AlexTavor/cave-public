import styled from "@emotion/styled";

export const CollapseHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;
    padding: 4px 0;

    &:hover {
        color: ${({ theme }) => theme.colors.primary};
    }
`;

export const ToggleIcon = styled.span<{ isOpen: boolean }>`
    display: inline-block;
    width: 12px;
    height: 12px;
    font-size: 10px;
    line-height: 12px;
    text-align: center;
    transition: transform 0.2s;
    transform: ${({ isOpen }) => (isOpen ? "rotate(90deg)" : "rotate(0deg)")};
`;

export const ActionButton = styled.button`
    background: none;
    border: 1px dashed #444;
    color: #888;
    cursor: pointer;
    font-size: 11px;
    padding: 4px 8px;
    border-radius: 4px;
    font-family: monospace;
    margin: 4px 0 4px 12px;

    &:hover {
        color: #fff;
        border-color: #666;
        background: rgba(255, 255, 255, 0.05);
    }
`;

export const OptionalFieldWrapper = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 4px;

    & > .delete-btn {
        opacity: 0;
        transition: opacity 0.2s;
        margin-top: 2px;
    }

    &:hover > .delete-btn {
        opacity: 1;
    }
`;

export const DeleteButton = styled.button`
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    padding: 2px 6px;
    opacity: 0.5;

    &:hover {
        opacity: 1;
    }
`;

export const ContentWrapper = styled.div<{ isCollapsible: boolean }>`
    padding-left: 8px;
    border-left: ${({ isCollapsible }) =>
        isCollapsible ? "1px solid #444" : "none"};
    margin-left: ${({ isCollapsible }) => (isCollapsible ? "4px" : "0")};
`;
// I added ContentWrapper to replace inline style
