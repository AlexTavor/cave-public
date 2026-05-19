import { HTMLAttributes } from "react";
import { IconKey } from "../../foundation/icon-registry/IconKey";

export type IconSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface GameIconProps extends HTMLAttributes<HTMLSpanElement> {
    /**
     * The ID of the icon to render. Can be a known IconKey or a raw string ID.
     */
    id: IconKey | string;

    /**
     * The visual size of the icon.
     * @default 'md'
     */
    size?: IconSize;

    /**
     * Optional CSS class name.
     */
    className?: string;
}

