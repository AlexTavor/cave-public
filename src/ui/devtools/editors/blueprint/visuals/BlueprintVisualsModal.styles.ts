import styled from "@emotion/styled";
import { Button } from "../../../../lib/atoms/button";

export const VisualsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    @media (max-width: 960px) {
        grid-template-columns: 1fr;
    }
`;

export const VisualsColumn = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

export const CloseButton = styled(Button)`
    position: fixed;
    bottom: ${({ theme }) => theme.spacing.lg};
    right: ${({ theme }) => theme.spacing.lg};
    z-index: 10000;
`;

export const VisualSection = styled.section`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border-radius: 12px;
    background: ${({ theme }) => theme.colors.surface};
    border: 1px solid ${({ theme }) => theme.colors.whiteBorderMedium};
`;

export const SectionTitle = styled.h3`
    margin: 0;
    font: 700 14px ${({ theme }) => theme.fonts.ui};
    color: ${({ theme }) => theme.colors.text};
`;

export const FieldLabel = styled.label`
    display: flex;
    flex-direction: column;
    gap: 4px;
    font: 12px ${({ theme }) => theme.fonts.ui};
    color: ${({ theme }) => theme.colors.secondary};
`;

export const InlineFields = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
`;

export const TextInput = styled.input`
    height: 34px;
    border-radius: 10px;
    border: 1px solid ${({ theme }) => theme.colors.whiteBorderMedium};
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    padding: 0 10px;
`;

export const SelectInput = styled.select`
    height: 34px;
    border-radius: 10px;
    border: 1px solid ${({ theme }) => theme.colors.whiteBorderMedium};
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    padding: 0 10px;
`;

export const RangeInput = styled.input`
    width: 100%;
`;

export const HintText = styled.div`
    font: 12px ${({ theme }) => theme.fonts.code};
    color: ${({ theme }) => theme.colors.secondary};
`;

export const SlotGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
`;

export const SlotButton = styled.button<{ $active: boolean; $filled: boolean }>`
    height: 38px;
    border-radius: 10px;
    border: 1px solid
        ${({ theme, $active }) =>
            $active ? theme.colors.primary : theme.colors.whiteBorderMedium};
    background: ${({ theme, $filled }) =>
        $filled ? theme.colors.surfaceHighlight : theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
`;

export const PreviewFrame = styled.div`
    position: relative;
    min-height: 260px;
    border-radius: 12px;
    overflow: hidden;
    background: ${({ theme }) => theme.colors.background};
`;

export const PreviewEmpty = styled.div`
    display: flex;
    min-height: 260px;
    align-items: center;
    justify-content: center;
    text-align: center;
    font: 12px ${({ theme }) => theme.fonts.code};
    color: ${({ theme }) => theme.colors.secondary};
`;
