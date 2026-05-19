import React from "react";
import { UiAvatar } from "../../body-avatar/UiAvatar";

export const BodyAvatar: React.FC<{
    subjectId: string | undefined;
    fallbackIconId?: string;
    size?: "sm" | "md" | "lg";
}> = (props) => <UiAvatar {...props} />;
