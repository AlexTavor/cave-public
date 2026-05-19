import React from "react";
import styled from "@emotion/styled";
import { Card } from "../../lib/atoms/card";
import {
    NotificationFrame,
    NotificationText,
    NotificationWord,
} from "./RuntimeNotificationViewport.styles";
import type {
    RuntimeEventDisplayModel,
    RuntimeNotificationTextPart,
    RuntimeOngoingDisplayModel,
} from "./runtimeNotificationTypes";

type RuntimeNotificationCardProps = {
    display: RuntimeEventDisplayModel | RuntimeOngoingDisplayModel;
    clickable?: boolean;
    attention?: boolean;
    onClick?: () => void;
};

const NotificationBody = styled.div`
    display: grid;
    gap: 2px;
`;

const renderParts = (parts: RuntimeNotificationTextPart[]) =>
    parts.map((part, index) => (
        <NotificationWord
            key={`${part.text}:${index}`}
            $colorKey={part.colorKey}
            $color={part.color}
        >
            {part.text}
        </NotificationWord>
    ));

export const RuntimeNotificationCard: React.FC<
    RuntimeNotificationCardProps
> = ({ display, clickable = false, attention = false, onClick }) => (
    <NotificationFrame
        $tone={display.tone}
        $clickable={clickable}
        $attention={attention}
        data-tone={display.tone}
        data-attention={attention}
        onClick={onClick}
        role={clickable ? "button" : undefined}
    >
        <Card
            variant={attention ? "highlight" : "surface"}
            padding="sm"
            interactive={clickable}
            data-card="runtime-notification"
        >
            <NotificationBody>
                <NotificationText>
                    {"text" in display
                        ? display.text
                        : renderParts(display.parts)}
                </NotificationText>
            </NotificationBody>
        </Card>
    </NotificationFrame>
);
