import styled from "@emotion/styled";

export const LoadingState = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: ${({ theme }) => theme.colors.secondary};
    font-family: ${({ theme }) => theme.fonts.code};
`;

export const EditorContainer = styled.div`
    height: 100%;
    width: 100%;
    background: ${({ theme }) => theme.colors.background};
    position: relative;
`;

export const ModalBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

export const ModalTitle = styled.div`
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: 16px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text};
`;

export const FieldLabel = styled.label`
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: 12px;
    color: ${({ theme }) => theme.colors.secondary};
`;

export const Input = styled.input`
    height: 34px;
    padding: 0 10px;
    border-radius: 10px;
    border: 1px solid ${({ theme }) => theme.colors.whiteBorderMedium};
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: 12px;
    outline: none;

    &:focus {
        border-color: ${({ theme }) => theme.colors.whiteBorderMedium};
    }
`;

export const AddRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
    padding-top: 6px;
`;

export const Select = styled.select`
    height: 34px;
    padding: 0 10px;
    border-radius: 10px;
    border: 1px solid ${({ theme }) => theme.colors.whiteBorderMedium};
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: 12px;
    outline: none;
`;

export { Tag, TagsRow } from "../passport/Passport.styles";
