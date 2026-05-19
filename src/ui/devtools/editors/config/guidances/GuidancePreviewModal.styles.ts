import styled from "@emotion/styled";

export const PreviewShell = styled.div`
    width: min(96vw, 1600px);
    height: min(92vh, 980px);
    display: flex;
    flex-direction: column;
    background: ${({ theme }) => theme.colors.background};
    border: 1px solid ${({ theme }) => theme.colors.whiteBorderMedium};
    border-radius: 12px;
    overflow: hidden;
`;

export const PreviewActions = styled.div`
    display: flex;
    justify-content: flex-end;
    padding: 12px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.whiteBorderMedium};
    background: ${({ theme }) => theme.colors.surface};
`;

export const PreviewBody = styled.div`
    flex: 1;
    min-height: 0;
    background: ${({ theme }) => theme.colors.background};
`;
