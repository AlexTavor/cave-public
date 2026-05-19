import React from "react";
import {
    Animatable,
    AnimatePresence,
} from "../../lib/atoms/animatable/Animatable";
import { RuntimeNotificationEventList } from "./RuntimeNotificationEventList";
import { RuntimeNotificationOngoingList } from "./RuntimeNotificationOngoingList";
import {
    NotificationBottomLeftAnchor,
    NotificationTopLeftAnchor,
    NotificationViewportLayer,
} from "./RuntimeNotificationViewport.styles";
import { useActiveRuntimeAttention } from "../attention/useActiveRuntimeAttention";

export const RuntimeNotificationViewport: React.FC = () => {
    const attention = useActiveRuntimeAttention();

    return (
        <AnimatePresence initial={false}>
            {attention?.hideNotifications === true ? null : (
                <Animatable key="runtime-notifications" type="slideRight">
                    <NotificationViewportLayer aria-label="Runtime notifications">
                        <NotificationBottomLeftAnchor>
                            <RuntimeNotificationOngoingList />
                        </NotificationBottomLeftAnchor>
                        <NotificationTopLeftAnchor>
                            <RuntimeNotificationEventList />
                        </NotificationTopLeftAnchor>
                    </NotificationViewportLayer>
                </Animatable>
            )}
        </AnimatePresence>
    );
};
