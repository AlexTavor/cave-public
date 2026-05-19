import { RichText } from "../../lib/atoms/rich-text/RichText";
import { useTextsEditorStore } from "./state/useTextsEditorStore";
import { AutosizeTextArea } from "./AutosizeTextArea";
import {
    FieldCard,
    FieldLabel,
    FieldPair,
    PreviewCard,
} from "./TextOwnerBlock.styles";

interface TextFieldRowProps {
    filename: string;
    path: string;
    label: string;
    value: string;
}

export const TextFieldRow = ({
    filename,
    path,
    label,
    value,
}: TextFieldRowProps) => {
    const updateText = useTextsEditorStore((state) => state.updateText);

    return (
        <FieldPair>
            <FieldCard>
                <FieldLabel>{label}</FieldLabel>
                <AutosizeTextArea
                    value={value}
                    onChange={(event) =>
                        updateText(filename, path, event.target.value)
                    }
                />
            </FieldCard>
            <FieldCard>
                <FieldLabel>{label}</FieldLabel>
                <PreviewCard>
                    <RichText text={value} />
                </PreviewCard>
            </FieldCard>
        </FieldPair>
    );
};
