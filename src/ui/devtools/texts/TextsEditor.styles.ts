import styled from "@emotion/styled";
import { Input, Select } from "../editors/fields/Shared.styles";

export const OverlayRoot = styled.div`
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: ${({ theme }) => theme.colors.background};
`;

export const StageChrome = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 24px;
    gap: 16px;
    overflow: hidden;
`;

export const FilterBar = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    align-items: end;
    @media (max-width: 960px) {
        grid-template-columns: 1fr;
    }
`;

export const FilterGroup = styled.label`
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: ${({ theme }) => theme.colors.secondary};
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
`;

export const FilterInput = styled(Input)`
    background: ${({ theme }) => theme.colors.background};
`;

export const FilterSelect = styled(Select)`
    background: ${({ theme }) => theme.colors.background};
`;

export const ScrollSurface = styled.div`
    flex: 1;
    min-height: 0;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-right: 4px;
`;

export const StateCard = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${({ theme }) => theme.colors.secondary};
    border: 1px solid ${({ theme }) => theme.colors.whiteBorderSubtle};
    border-radius: ${({ theme }) => theme.radius.md};
    background: ${({ theme }) => theme.colors.surface};
`;
