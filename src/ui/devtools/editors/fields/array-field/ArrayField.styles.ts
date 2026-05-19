import styled from "@emotion/styled";

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

export const Header = styled.div`
    font-size: 12px;
    color: #888;
    font-family: monospace;
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

export const ItemsContainer = styled.div`
    padding-left: 8px;
    border-left: 1px solid #333;
    margin-left: 4px;
    margin-top: 4px;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

export const HeaderClickable = styled.div`
    cursor: pointer;
    display: flex;
    gap: 6px;
`;

export const ItemWrapper = styled.div`
    flex: 1;
    min-width: 0;
`;
