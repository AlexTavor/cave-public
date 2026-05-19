import { ReactNode, Ref } from "react";

export interface ToolFrameProps {
    title: ReactNode;
    icon?: ReactNode;
    onClose?: () => void;
    toolbarActions?: ReactNode;
    children: ReactNode;
    className?: string;
    bodyRef?: Ref<HTMLDivElement>;
}
