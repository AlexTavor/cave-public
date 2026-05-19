import styled from "@emotion/styled";
import { Card } from "../../lib/atoms/card";

export const HabitiGainModalContainer = styled(Card)`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.lg};
    min-width: 400px;
    min-height: 70vh;
`;

export const HabitiGainTitle = styled.h1`
    font-size: ${({ theme }) => theme.fontSize.xxl};
    font-weight: 600;
    text-align: center;
    color: ${({ theme }) => theme.colors.xp};
`;

export const HabitiGainSubtitle = styled.h2`
    font-size: ${({ theme }) => theme.fontSize.lg};
    font-weight: 500;
    text-align: center;
    color: ${({ theme }) => theme.colors.text};
    font-style: italic;
`;

export const HabitiListContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.md};
    width: 100%;
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 200px;
`;

export const HabitiListRowContainer = styled.div`
    display: flex;
    flex-direction: row;
    gap: ${({ theme }) => theme.spacing.sm};
    align-items: center;
`;

const HabitiListText = styled.div`
    min-width: 20%;
`;

export const HabitiTitleCell = styled(HabitiListText)`
    color: ${({ theme }) => theme.colors.xp};
`;

export const HabitiEffectCell = styled(HabitiListText)`
    color: ${({ theme }) => theme.colors.secondary};
`;

export const HabitiDescriptionCell = styled(HabitiListText)`
    color: ${({ theme }) => theme.colors.text};
`;

export const HabitiSummaryContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm};
    align-items: flex-start;
    max-width: 88px;
    min-width: 88px;
`;

