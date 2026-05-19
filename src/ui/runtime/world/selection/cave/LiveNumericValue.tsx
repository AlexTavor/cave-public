import React from "react";
import { useLiveNumericValue } from "./useLiveNumericValue";

type LiveNumericValueProps = {
    runtime: { getEntity: (id: string) => any } | null;
    entityId: string;
    path: string;
    formatter?: (val: number) => string;
};

export const LiveNumericValue: React.FC<LiveNumericValueProps> = ({
    runtime,
    entityId,
    path,
    formatter = (v) => Math.floor(v).toString(),
}) => {
    const spanRef = useLiveNumericValue({
        runtime,
        entityId,
        path,
        formatter,
    });

    return <span ref={spanRef}>---</span>;
};
