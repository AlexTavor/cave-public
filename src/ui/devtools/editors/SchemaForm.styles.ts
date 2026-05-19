import styled from "@emotion/styled";

// Re-export common styles used by container fields (Array/Object) that still live in SchemaForm
export {
    FieldContainer,
    Label,
    Input,
    TextArea,
    Select,
} from "./fields/Shared.styles";

export const ArrayItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 4px;
    margin-bottom: 8px;
    position: relative;
`;

export const ErrorContainer = styled.div`
    color: #ff6b6b;
    white-space: pre-wrap;
    margin-bottom: 10px;
    padding: 10px;
    background: rgba(255, 0, 0, 0.1);
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
`;

export const FormWrapper = styled.div`
    padding-bottom: 40px;
`;
