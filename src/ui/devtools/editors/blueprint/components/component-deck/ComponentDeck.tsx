import React from "react";
import { Deck } from "./ComponentDeck.styles";
import { ComponentList } from "./ComponentList";
import { ComponentAdder } from "./ComponentAdder";
import { useBlueprintContext } from "../../BlueprintContext";
import { useBlueprintSlice } from "../../../../state/moduleSession/useBlueprintSlice";

export const ComponentDeck: React.FC = () => {
    const { filename, blueprintId } = useBlueprintContext();
    const blueprint = useBlueprintSlice(filename, blueprintId);

    if (!blueprint) return null;

    return (
        <Deck>
            <ComponentList />
            <ComponentAdder />
        </Deck>
    );
};
