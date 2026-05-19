import styled from "@emotion/styled";

export const ColorFieldRoot = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

export const ColorFieldLabel = styled.div`
    font: 12px ${({ theme }) => theme.fonts.ui};
    color: ${({ theme }) => theme.colors.secondary};
`;

export const ColorFieldControls = styled.div`
    display: grid;
    grid-template-columns: minmax(108px, 0.8fr) minmax(0, 1fr) 34px;
    gap: 8px;
    align-items: end;
    @media (max-width: 640px) {
        grid-template-columns: 1fr;
    }
`;

export const ColorPreview = styled.div<{ $color: string }>`
    width: 34px;
    height: 34px;
    border-radius: 10px;
    border: 1px solid ${({ theme }) => theme.colors.whiteBorderMedium};
    background: ${({ $color }) => $color};
`;
