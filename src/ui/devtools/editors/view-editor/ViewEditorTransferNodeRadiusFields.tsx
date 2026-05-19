import React from "react";
import {
    FieldLabel,
    InlineFields,
    SectionTitle,
    TextInput,
    VisualSection,
} from "../blueprint/visuals/BlueprintVisualsModal.styles";
import type { ViewEditorAdapter } from "./ViewEditor.types";

export const ViewEditorTransferNodeRadiusFields: React.FC<{
    radius: ViewEditorAdapter["transferNodeRadius"];
}> = ({ radius }) =>
    radius ? (
        <VisualSection>
            <SectionTitle>Transfer Radius</SectionTitle>
            <InlineFields>
                <FieldLabel>
                    Radius Min
                    <TextInput
                        type="number"
                        value={radius.min}
                        onChange={(e) =>
                            radius.updateMin(Number(e.target.value))
                        }
                    />
                </FieldLabel>
                <FieldLabel>
                    Radius Max
                    <TextInput
                        type="number"
                        value={radius.max}
                        onChange={(e) =>
                            radius.updateMax(Number(e.target.value))
                        }
                    />
                </FieldLabel>
            </InlineFields>
        </VisualSection>
    ) : null;
