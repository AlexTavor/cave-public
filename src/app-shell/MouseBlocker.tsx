import type { ReactNode, SyntheticEvent } from "react";

const fillStyle = {
    position: "absolute" as const,
    inset: 0,
};

const stopMouseEvent = (event: SyntheticEvent): void => {
    event.stopPropagation();
};

const ignoreKeyboardEvent = (): void => {};

interface MouseBlockerProps {
    children: ReactNode;
    fill?: boolean;
}

export const MouseBlocker = ({
    children,
    fill = false,
}: Readonly<MouseBlockerProps>) => (
    <div
        style={fill ? fillStyle : undefined}
        onClick={stopMouseEvent}
        onContextMenu={stopMouseEvent}
        onKeyDown={ignoreKeyboardEvent}
        onMouseDown={stopMouseEvent}
        onMouseUp={stopMouseEvent}
        onPointerDown={stopMouseEvent}
        onPointerUp={stopMouseEvent}
        onWheel={stopMouseEvent}
    >
        {children}
    </div>
);
