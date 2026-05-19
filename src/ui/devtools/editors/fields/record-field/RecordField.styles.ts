import styled from "@emotion/styled";

export const Header = styled.div`
    font-size: 12px;
    color: #888;
    font-family: monospace;
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

export const Entries = styled.div`
    padding-left: 8px;
    border-left: 1px solid #333;
    margin-left: 4px;
    margin-top: 4px;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

export const EntryRow = styled.div`
    display: flex;
    gap: 6px;
    align-items: flex-start;
`;

export const EntryBody = styled.div`
    flex: 1;
    min-width: 0;
`;

export const AddRow = styled.div`
    display: flex;
    gap: 6px;
    margin-top: 6px;
`;

export const EmptyState = styled.div`
    color: #666;
    font-size: 11px;
    font-style: italic;
    margin-left: 12px;
`;
