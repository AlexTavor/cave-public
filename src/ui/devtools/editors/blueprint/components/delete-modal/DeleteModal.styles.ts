import styled from "@emotion/styled";

export const ImpactList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const WarningText = styled.div`
    font-family: monospace;
    font-size: 12px;
    color: #ffcc66;
`;

export const ImpactItem = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: center;
`;

export const ItemLabel = styled.div`
    font-family: monospace;
    font-size: 12px;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const ItemPath = styled.div`
    font-family: monospace;
    font-size: 11px;
    color: #888;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const EmptyState = styled.div`
    font-family: monospace;
    font-size: 12px;
    color: #888;
`;

export const Footer = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
`;
