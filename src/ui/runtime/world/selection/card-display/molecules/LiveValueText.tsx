import React from "react";
import { useEntityTextRef } from "../../../entity-state-link";
import type { EntityTextBinding } from "../../../entity-state-link";

export const LiveValueText: React.FC<{
    binding: EntityTextBinding;
    ariaLabel?: string;
}> = ({ binding, ariaLabel }) => {
    const ref = useEntityTextRef<HTMLSpanElement>(binding);
    return <span ref={ref} aria-label={ariaLabel} />;
};
