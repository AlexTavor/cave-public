import styled from "@emotion/styled";

export const HudCard = styled.div`
    position: absolute;
    top: 32px;
    right: 32px;
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 18px 28px;
    border-radius: 999px;
    background: rgba(6, 10, 28, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(18px);
    box-shadow: 0 35px 60px rgba(2, 4, 15, 0.65);
    z-index: 5;
    pointer-events: auto;

    @media (max-width: 768px) {
        flex-direction: column;
        border-radius: 28px;
        width: calc(100% - 32px);
        top: auto;
        bottom: 32px;
        left: 50%;
        right: auto;
        transform: translate(-50%, 0);
        padding: 20px;
    }
`;

export const HudBadge = styled.div`
    font-size: 0.85rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.selected};
`;

export const HudSubtitle = styled.div`
    font-size: 0.85rem;
    color: ${({ theme }) => theme.colors.secondary};
    margin-top: 4px;
`;

export const HudActions = styled.div`
    display: flex;
    gap: 12px;
`;
