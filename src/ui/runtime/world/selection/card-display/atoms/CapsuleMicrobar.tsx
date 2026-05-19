import React from "react";
import { FillBar } from "../../../../../lib/atoms/fill-bar/FillBar";
import { useEntityBarRef } from "../../../entity-state-link";
import type { CapsuleProgressModel } from "../cardDisplayTypes";

export const CapsuleMicrobar: React.FC<{ progress: CapsuleProgressModel }> = ({
    progress,
}) => {
    const fillRef = useEntityBarRef(progress);
    return (
        <FillBar
            current={0}
            max={1}
            color={progress.color}
            height={4}
            fillRef={fillRef}
        />
    );
};
