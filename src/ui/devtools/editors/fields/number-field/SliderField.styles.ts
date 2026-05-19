import styled from "@emotion/styled";
import { Input } from "../Shared.styles";

export const SliderRow = styled.div`
    display: grid;
    grid-template-columns: 1fr 90px;
    gap: ${({ theme }) => theme.spacing.sm};
    align-items: center;
`;

export const RangeInput = styled.input`
    width: 100%;
    accent-color: ${({ theme }) => theme.colors.selected};
`;

export const CompactInput = styled(Input)`
    padding: 6px 8px;
`;
