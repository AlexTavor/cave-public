import styled from "@emotion/styled";
import { Card } from "../../../../lib/atoms/card";

export const PassportCard = styled(Card)`
    margin: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const PassportTop = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
`;

export const PassportText = styled.div`
    min-width: 0;
`;

export const PassportTitle = styled.div`
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: 18px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text};
    line-height: 1.1;
`;

export const PassportId = styled.div`
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: 12px;
    color: ${({ theme }) => theme.colors.secondary};
`;

export const StatusRow = styled.div`
    display: flex;
    gap: 8px;
`;

export const TagsRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

export const Tag = styled.div`
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: 11px;
    color: ${({ theme }) => theme.colors.secondary};
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid ${({ theme }) => theme.colors.whiteBorderMedium};
    background: ${({ theme }) => theme.colors.surface};
`;

export const DirtyTag = styled(Tag)`
    border-color: ${({ theme }) => theme.colors.whiteBorderSubtle};
`;
