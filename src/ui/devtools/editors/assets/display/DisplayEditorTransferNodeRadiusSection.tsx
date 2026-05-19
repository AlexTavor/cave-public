import { Button } from "../../../../lib/atoms/button";
import { FieldContainer, Input } from "../../fields/Shared.styles";
import { ActionRow, ErrorText, SectionLabel } from "./DisplayEditor.styles";
import { DisplayEditorField } from "./DisplayEditorField";
import { useDisplayTransferNodeRadiusForm } from "./useDisplayTransferNodeRadiusForm";
import type { TransferNodeRadiusByValueRule } from "../../../state/moduleStore.assets";

const FIELDS = [
    ["minValue", "Min Value"],
    ["minRadius", "Min Radius"],
    ["maxValue", "Max Value"],
    ["maxRadius", "Max Radius"],
] as const;

export const DisplayEditorTransferNodeRadiusSection = (props: {
    ids: Record<(typeof FIELDS)[number][0], string>;
    rule: TransferNodeRadiusByValueRule | undefined;
    onChange(rule: TransferNodeRadiusByValueRule | undefined): void;
}) => {
    const form = useDisplayTransferNodeRadiusForm({
        initialRule: props.rule,
        onCommit: props.onChange,
    });
    return (
        <>
            <FieldContainer>
                <SectionLabel>Transfer Node Radius by Value</SectionLabel>
                <ActionRow>
                    {form.isEnabled ? (
                        <Button size="sm" variant="ghost" onClick={form.clear}>
                            Clear
                        </Button>
                    ) : (
                        <Button size="sm" variant="ghost" onClick={form.enable}>
                            Author Rule
                        </Button>
                    )}
                </ActionRow>
                {form.error ? (
                    <ErrorText role="alert">{form.error}</ErrorText>
                ) : null}
            </FieldContainer>
            {form.isEnabled &&
                FIELDS.map(([name, label]) => (
                    <DisplayEditorField
                        key={name}
                        controlId={props.ids[name]}
                        label={label}
                        tooltip="Author a complete transfer radius rule before applying it."
                    >
                        <Input
                            id={props.ids[name]}
                            value={form.fields[name]}
                            onChange={(e) =>
                                form.setField(name, e.target.value)
                            }
                            inputMode="decimal"
                        />
                    </DisplayEditorField>
                ))}
            {form.isEnabled && (
                <FieldContainer>
                    <ActionRow>
                        <Button size="sm" variant="ghost" onClick={form.commit}>
                            Apply
                        </Button>
                    </ActionRow>
                </FieldContainer>
            )}
        </>
    );
};
