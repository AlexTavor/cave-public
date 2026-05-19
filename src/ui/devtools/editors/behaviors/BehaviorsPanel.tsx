import React from "react";
import { useEntityBehaviors } from "../hooks/useEntityBehaviors";
import { BehaviorInput } from "./BehaviorInput";
import { BehaviorList } from "./BehaviorList";
import { Panel } from "./BehaviorsPanel.styles";

export const BehaviorsPanel: React.FC = () => {
    const { behaviors, addBehavior, removeBehavior, updateBehavior, error } =
        useEntityBehaviors();

    return (
        <Panel>
            <BehaviorInput onSubmit={addBehavior} error={error} />
            <BehaviorList
                items={behaviors}
                onDelete={removeBehavior}
                onUpdate={updateBehavior}
            />
        </Panel>
    );
};
