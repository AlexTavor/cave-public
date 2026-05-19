import { ReactNode } from "react";

export interface ComponentRowProps {
    title: ReactNode;
    titleTooltip?: string;
    icon?: ReactNode;
    summary?: ReactNode;
    children: ReactNode;

    isOpen?: boolean;
    defaultOpen?: boolean;
    onToggle?: (isOpen: boolean) => void;

    onDelete?: () => void;
    deleteLabel?: string;

    className?: string;
}
