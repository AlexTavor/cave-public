import styled from "@emotion/styled";
import { GameIcon } from "../../../../../lib/atoms/game-icon";
import { UiAvatar } from "../../../body-avatar/UiAvatar";
import type {
    CardDisplayActionHandler,
    CardTitleModel,
} from "../cardDisplayTypes";
import { TitleText } from "../atoms/CardDisplayText.styles";
import { wrapDisplaySurface } from "../wrapDisplaySurface";

const TitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.sm};
    padding-top: ${({ theme }) => theme.spacing.sm};
    padding-bottom: ${({ theme }) => theme.spacing.lg};
`;

type Props = Readonly<{
    model?: CardTitleModel;
    title?: CardTitleModel;
    onAction?: CardDisplayActionHandler;
}>;

export function CardTitleBlock({ model, title, onAction }: Props) {
    const resolved = model ?? title;
    if (!resolved) return null;
    let leading: React.ReactNode = null;
    if (resolved.avatar) leading = <UiAvatar {...resolved.avatar} />;
    else if (resolved.iconId)
        leading = <GameIcon id={resolved.iconId} size="sm" />;

    return wrapDisplaySurface({
        action: resolved.action,
        onAction,
        tooltip: resolved.tooltip,
        children: (
            <TitleRow id="title-row">
                {leading}
                <TitleText id="title-text">{resolved.text}</TitleText>
            </TitleRow>
        ),
    });
}
