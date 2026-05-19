Low-Level Design: Generic Schema Editor Support

1. Context & Problem

Problem:

Missing Fields: The StateEditor component, currently hardcoded for the state component, assumes all state values are simple numbers. It fails to render complex structures like arrays (e.g., processing_outputs in game_loop_v2.json) or objects because it force-casts everything to numeric inputs.

Data Overwrites: Because StateEditor coerces non-numeric values to 0 (or fails to handle them entirely) and writes back keys explicitly as numbers upon editing or saving, it corrupts complex state data (like Arrays or Objects) into numbers, leading to data loss in the draft.

Solution:
Replace the specialized StateEditor with the generic SchemaForm. To support the complex types found in state (specifically ZodRecord for the state map itself, and ZodUnion for polymorphic values like GameValue), we must enhance the schema editor capabilities to support ZodRecord (dynamic key-value pairs) and ZodUnion (polymorphic values).

2. Component Design

2.1. src/ui/devtools/editors/utils/schemaTypeNames.ts

Responsibility:
Identify ZodRecord and ZodUnion types to route them to the correct field components. Currently, they might fall through to "object" or "unknown".

Changes:
Update getZodType to return specific strings for these types.

export function getZodType(schema: z.ZodTypeAny): string {
const base = unwrapSchema(schema);
const typeName = getSchemaType(base);

    // ... existing checks ...
    if (typeName === "ZodRecord") return "record";
    if (typeName === "ZodUnion") return "union";

    // ... existing fallback logic ...

}

2.2. src/ui/devtools/editors/fields/SchemaField.tsx

Responsibility:
Route the new types ("record", "union") to their respective components.

Changes:

Import RecordField and UnionField (to be created).

Add case for "record" -> <RecordField />.

Add case for "union" -> <UnionField />.

2.3. src/ui/devtools/editors/fields/record-field/RecordField.tsx (New)

Responsibility:
Render a list of key-value pairs where keys are dynamic string inputs (unlike ObjectField where keys are fixed by schema) and values are rendered recursively via SchemaField based on the record's valueType.

Props: FieldProps

Logic:

Data Fetching: Use useRecordField hook to get the current object.

Rendering:

Render a header (Label + Add Button).

Iterate over Object.keys(data).

Render a row for each key:

Label (Key) - effectively static once created for this version, or standard SchemaField behavior where path includes the key.

Value Component (SchemaField with path ${rootPath}.${key}).

Delete button.

Adding: Render an "Add Entry" footer with a text input for the new Key and an "Add" button.

2.4. src/ui/devtools/editors/fields/record-field/useRecordField.ts (New)

Responsibility:
State management for RecordField.

Logic:

data: Fetch object from session store using getByPath. Default to {} if missing.

handleAdd(key):

Check if key exists.

Resolve valueSchema from the ZodRecord.

updateDraft -> set path.key to getDefaultValue(valueSchema).

Clear add input.

handleRemove(key):

updateDraft -> delete path.key.

valueSchema: Extract valueType from ZodRecord.\_def.

2.5. src/ui/devtools/editors/fields/union-field/UnionField.tsx (New)

Responsibility:
Handle ZodUnion by determining which option in the union matches the current data and rendering that option's schema.

Props: FieldProps

Logic:

Hook: useUnionField(filename, path, schema).

Rendering:

If activeOptionIndex is valid:

Render SchemaField with the schema at schema.options[activeOptionIndex].

Render a "Type Switcher" (Select/Dropdown) to manually change the type if the user wants to switch (e.g., from Number to Logic Sentence).

If no match found (or data is undefined):

Default to the first option's schema.

2.6. src/ui/devtools/editors/fields/union-field/useUnionField.ts (New)

Responsibility:
Logic for selecting the active schema from a union.

Logic:

currentValue: Fetch from store.

options: Extract schema.\_def.options.

activeOptionIndex:

Iterate options.

Return index of first option where option.safeParse(currentValue).success is true.

If no match, return 0 (default).

handleTypeChange(index):

updateDraft -> set path to getDefaultValue(options[index]).

This resets the data to the new type's default, preventing schema mismatch errors.

2.7. src/ui/devtools/editors/blueprint/components/component-deck/ComponentList.tsx

Responsibility:
Remove the hardcoded StateEditor exception, enabling SchemaForm for the state component.

Changes:

Remove the ternary check for key === "state".

Let state render via SchemaForm like other components.

// Old
{key === "state" ? (
<StateEditor />
) : (
<SchemaForm ... />
)}

// New
<SchemaForm
schema={entry.schema}
filename={filename}
rootPath={`${rootPath}.components.${key}`}
/>

3. Implementation Steps

Utilities: Update schemaTypeNames.ts to detect ZodRecord and ZodUnion.

Fields: Implement useRecordField and RecordField.

Fields: Implement useUnionField and UnionField.

Routing: Register new fields in SchemaField.tsx.

Integration: Switch ComponentList.tsx to use SchemaForm for state.

Cleanup: (Optional) Remove StateEditor if it is no longer used anywhere else (check references).

4. Architectural Compliance

Immutable Laws: No direct mutation; all edits go through useSessionStore.updateDraft.

UI Architecture: Logic in hooks (useRecordField, useUnionField), UI in components. Styles in .styles.ts.

Testing: New fields require basic rendering tests (smoke tests).

5. Verification Strategy

Record Test:

Open sys_world.

Check state component.

It should render as a list of keys (e.g., population, food).

Add a new key "test_val". It should appear.

Delete "test_val". It should disappear.

Union Test:

Open game_loop_v2.json.

Find a station with processing_outputs (e.g., station_absorption_pool -> state -> processing_outputs).

processing_outputs is likely a GameValue (Union of number | logic | array).

Ensure it renders correctly (likely as an Array if it's a list of output configs, or as the specific union type).

Try switching a simple state value (like heat) from Number to Logic (if schema allows).

Non-Destructive Save:

Open a blueprint with complex state.

Save without editing.

Inspect the file (via terminal cat or disk). The complex state must remain unchanged.
