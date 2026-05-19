import styled from "@emotion/styled";
import type { AppTheme } from "../../../../lib/foundation/theme/types";
import { Card } from "../../../../lib/atoms/card";

const getTileSize = (theme: AppTheme): string =>
    `calc(${theme.iconSize.xl} + ${theme.iconSize.xl} + ${theme.spacing.xl})`;

export const TileCard = styled(Card)`
    width: ${({ theme }) => getTileSize(theme)};
    height: ${({ theme }) => getTileSize(theme)};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
`;

export const SettingsCard = styled(TileCard)`
    border: ${({ theme }) => theme.borderWidth.thin} dashed
        ${({ theme }) => theme.colors.whiteBorderMedium};
`;

export const BlueprintCard = styled(TileCard)`
    position: relative;
`;

export const TileContent = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${({ theme }) => theme.spacing.xs};
`;

export const SettingsIcon = styled.span`
    font-size: ${({ theme }) => theme.fontSize.xl};
`;
