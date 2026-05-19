import styled from "@emotion/styled";
import { Card } from "../../../../../lib/atoms/card";

export const Grid = styled.div`
    padding: 16px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-content: flex-start;
`;

export const AssetCard = styled(Card)`
    width: 110px;
    height: 110px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
`;

export const ItemLabel = styled.div`
    margin-top: 8px;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.secondary};
    text-align: center;
    max-width: 100px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: ${({ theme }) => theme.fonts.ui};
`;
