import type React from "react";
import type { Runtime } from "../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../engine/runtime/types";

export type SelectionCardProps = {
    entity: RuntimeEntity;
    runtime: Runtime | null;
};

export type SelectionLens = {
    id: string;
    match: (entity: RuntimeEntity, runtime: Runtime | null) => boolean;
    Component: React.FC<SelectionCardProps>;
};
