import styled from "@emotion/styled";
import { Input } from "../Shared.styles";

export const PickerTrigger = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #444;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
        border-color: ${({ theme }) => theme.colors.primary};
    }
`;

export const GridContainer = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
    gap: 8px;
    max-height: 400px;
    overflow-y: auto;
    padding: 16px;
    width: 600px;
`;

export const IconOption = styled.div<{ isSelected: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    border-radius: 4px;
    cursor: pointer;
    background: ${({ isSelected, theme }) =>
        isSelected ? theme.colors.surfaceHighlight : "transparent"};
    border: 1px solid
        ${({ isSelected, theme }) =>
            isSelected ? theme.colors.primary : "transparent"};

    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }
`;

export const SearchInput = styled(Input)`
    margin: 16px;
    width: calc(100% - 32px);
`;

export const ModalHeader = styled.div`
    padding: 16px;
    border-bottom: 1px solid #444;
`;

export const ModalFooter = styled.div`
    padding: 16px;
    border-top: 1px solid #444;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
`;
