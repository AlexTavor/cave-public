import styled from "@emotion/styled";

export const BlockRow = styled.section`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

export const HeaderGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    @media (max-width: 1100px) {
        grid-template-columns: 1fr;
    }
`;

export const MirrorPanel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border-radius: ${({ theme }) => theme.radius.md};
    border: 1px solid ${({ theme }) => theme.colors.whiteBorderSubtle};
    background: ${({ theme }) => theme.colors.surface};
`;

export const OwnerId = styled.div`
    font-size: 18px;
    font-weight: 600;
`;

export const OwnerMeta = styled.div`
    font-size: 12px;
    color: ${({ theme }) => theme.colors.secondary};
    letter-spacing: 0.06em;
`;

export const FieldStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

export const FieldPair = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    @media (max-width: 1100px) {
        grid-template-columns: 1fr;
    }
`;

export const FieldCard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const FieldLabel = styled.label`
    font-size: 12px;
    color: ${({ theme }) => theme.colors.secondary};
    font-family: monospace;
`;

export const PreviewCard = styled.div`
    min-height: 48px;
    padding: 10px 12px;
    border-radius: ${({ theme }) => theme.radius.sm};
    border: 1px solid ${({ theme }) => theme.colors.whiteBorderSubtle};
    background: ${({ theme }) => theme.colors.background};
`;
