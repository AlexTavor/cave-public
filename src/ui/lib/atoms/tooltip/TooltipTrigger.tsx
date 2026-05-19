import React, { cloneElement } from "react";

interface TooltipTriggerProps {
    children: React.ReactNode;
    disabled: boolean;
    propRef: React.Ref<HTMLElement>;
    triggerRef: React.Ref<HTMLElement>;
    getReferenceProps: (
        userProps?: React.HTMLProps<HTMLElement>,
    ) => React.HTMLProps<HTMLElement>;
}

export const renderTooltipTrigger = ({
    children,
    disabled,
    propRef,
    triggerRef,
    getReferenceProps,
}: TooltipTriggerProps) => {
    if (disabled) {
        return React.isValidElement(children) ? (
            cloneElement(children, { ref: propRef } as any)
        ) : (
            <span ref={propRef}>{children}</span>
        );
    }

    if (React.isValidElement(children)) {
        return cloneElement(
            children,
            getReferenceProps({
                ref: triggerRef,
                ...(children as React.ReactElement<any>).props,
            }),
        );
    }

    return (
        <span ref={triggerRef} {...getReferenceProps()}>
            {children}
        </span>
    );
};
