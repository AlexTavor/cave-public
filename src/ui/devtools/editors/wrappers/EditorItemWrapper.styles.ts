import styled from "@emotion/styled";

export const WrapperContainer = styled.div<{ isGhost?: boolean }>`
    position: relative;
    display: inline-block;
    cursor: pointer;
    border-radius: ${({ theme }: any) => theme.radius.md};
    transition: transform 0.1s ease;

    ${({ isGhost, theme }: any) =>
        isGhost &&
        `
        border: 2px dashed ${theme.colors.surfaceHighlight};
        opacity: 0.6;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 64px;
        min-height: 64px;
        &:hover {
            opacity: 1;
            border-color: ${theme.colors.primary};
            background: rgba(255, 255, 255, 0.05);
        }
    `}
`;

export const Overlay = styled.div`
    position: absolute;
    top: -4px;
    left: -4px;
    right: -4px;
    bottom: -4px;
    background: rgba(0, 0, 0, 0.6);
    border-radius: ${({ theme }: any) => theme.radius.md};
    border: 1px solid ${({ theme }: any) => theme.colors.primary};
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    backdrop-filter: blur(2px);
    animation: fadeIn 0.1s ease;
    pointer-events: none;

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
`;

export const EditLabel = styled.span`
    font-size: 12px;
    font-weight: bold;
    letter-spacing: 1px;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
`;

export const GhostContent = styled.span`
    font-size: 24px;
    opacity: 0.5;
`;

export const ActionsContainer = styled.div`
    position: absolute;
    top: -8px;
    right: -8px;
    display: flex;
    gap: 8px;
    z-index: 20;
    pointer-events: auto;
`;

export const ActionButton = styled.div<{ variant?: 'danger' | 'primary' }>`
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    background: ${({ theme }) => theme.colors.surface};
    border: 1px solid ${({ theme }) => theme.colors.activity || "rgba(255,255,255,0.2)"};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    transition: all 0.2s ease;
    color: ${({ theme, variant }) => variant === 'danger' ? theme.colors.error : theme.colors.text};

    &:hover {
        transform: scale(1.1);
        background: ${({ theme }) => theme.colors.surfaceHighlight};
        border-color: ${({ theme, variant }) => variant === 'danger' ? theme.colors.error : theme.colors.primary};
    }
`;

