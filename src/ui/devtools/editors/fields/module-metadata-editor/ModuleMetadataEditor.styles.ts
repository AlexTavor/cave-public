import styled from "@emotion/styled";

export const Container = styled.div`
    height: 100%;
    display: flex;
    flex-direction: column;
    background: ${({ theme }) => theme.colors.background};
`;

export const Toolbar = styled.div`
    padding: 8px 16px;
    background: ${({ theme }) => theme.colors.surface};
    border-bottom: 1px solid ${({ theme }) => theme.colors.whiteBorderSubtle};
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

export const ToolbarActions = styled.div`
    display: flex;
    gap: 8px;
`;

export const ScrollArea = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 16px;
`;

export const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
`;

export const SectionTitle = styled.h3`
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text};
`;
