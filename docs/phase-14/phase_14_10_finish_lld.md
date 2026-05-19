Low-Level Design: Devtools .cave and .art Editors

1. Overview

This document details the architecture for refactoring the Devtools editors for .cave (System Config) and .art (Asset Pack) files. Currently, these are largely raw JSON editors. The goal is to transform them into user-friendly Navigation Dashboards that route to specific, schema-aware sub-editors for individual sections (e.g., Physics, Vitality, Icons).

Goals

Dashboard Pattern: Replace monolithic JSON editors with "hub" components (SystemConfigEditor, AssetPackEditor) that render navigation cards.

Granular Routing: Introduce virtual paths for sub-sections (e.g., vitality::[file], game_config::[file]) and map them to dedicated React components.

Tooltip Integration: Enhance the SchemaForm and field components (NumberField, BooleanField) to support ui:slider and tooltip metadata parsed from Zod schemas.

2. Architecture & Components

2.1. Window Manager & Routing

The WindowLayoutResolver and routing logic must be expanded to support the new granular views.

src/ui/devtools/shell/window-manager/tabIds.ts:

Add new TabIdParams kinds: vitality, game_config, vein_config.

Expand AssetCategory to include "resources" and "styles".

src/ui/devtools/shell/window-manager/virtualPath.types.ts:

Add corresponding VirtualPath kinds.

src/ui/devtools/shell/window-manager/WindowLayoutResolver.editors.tsx:

New Mappings:

vitality → VitalitySettingsEditor

game_config → GameConfigEditor

vein_config → VeinConfigEditor

src/ui/devtools/shell/window-manager/hooks/useWindowManagerRouteHandlers.base.ts:

Add handlers for vitality and game_config.

2.2. .cave Editor (System Config)

Responsibility: Managing global simulation settings.

Dashboard (SystemConfigEditor.tsx):

Renders a ToolFrame with a grid of Card components:

Impulse Physics: Opens physics::[filename] (Existing).

Vitality Settings: Opens vitality::[filename] (New).

Game Config: Opens game_config::[filename] (New).

Sub-Editors:

VitalitySettingsEditor.tsx: A SchemaForm bound to VitalitySettingsSchema at path vitality.

GameConfigEditor.tsx: A wrapper around RawJsonEditor for game_config, including a static help text header explaining faceBlueprintByAttribute.

2.3. .art Editor (Asset Pack)

Responsibility: Managing visual assets (icons, resources, styles, veins).

Dashboard (AssetPackEditor.tsx):

Renders a ToolFrame with navigation cards:

Icons: Opens list::[file]::assets::icons.

Resources: Opens list::[file]::assets::resources.

Styles: Opens list::[file]::assets::styles.

Vein Config: Opens vein_config::[file].

Asset Management:

The existing AssetListPanel and useAssetGrid are currently hardcoded for icons.

Refactor: Generalize useAssetGrid to accept category ("icons", "resources", "styles").

Refactor: Update moduleStore.actions.assets.ts to accept generic asset categories instead of throwing on non-icons.

Sub-Editors:

ResourceAssetEditor.tsx: A form for ResourceVisualSchema (color, radius, effect).

StyleAssetEditor.tsx: A form for EntityStyleSchema (shape, color, border).

VeinConfigEditor.tsx: A RawJsonEditor pointing to assets.settings.vein_network.

2.4. Tooltip & Schema Enhancements

Responsibility: Providing inline documentation in SchemaForm.

src/data/schemas/\*_/_.ts:

Update schemas to include tooltip text in .describe().

Format: ui:slider;min=0;max=1|tooltip:Controls the friction...

src/ui/devtools/editors/fields/SchemaField.tsx:

Parse the tooltip segment from the description string.

Pass tooltip prop to field components.

Fields (NumberField.tsx, BooleanField.tsx, etc.):

Accept tooltip?: string.

If present, wrap the <Label> with <SmartTooltip>.

3. Implementation Details

3.1. AssetPackEditor.tsx (Refactor)

Replaces the existing component which just redirects to the asset list.

// Pseudocode
export const AssetPackEditor = ({ filename }) => {
const openFile = useShellStore(s => s.openFile);
return (
<ToolFrame title={`Asset Pack: ${filename}`}>
<Grid>
<Card onClick={() => openFile(`list::${filename}::assets::icons`)}>Icons</Card>
<Card onClick={() => openFile(`list::${filename}::assets::resources`)}>Resources</Card>
<Card onClick={() => openFile(`list::${filename}::assets::styles`)}>Styles</Card>
<Card onClick={() => openFile(`vein_config::${filename}`)}>Vein Network</Card>
</Grid>
</ToolFrame>
);
}

3.2. SystemConfigEditor.tsx (Refactor)

Replaces the JSON view.

// Pseudocode
export const SystemConfigEditor = ({ filename }) => {
const openFile = useShellStore(s => s.openFile);
return (
<ToolFrame title={`System Config: ${filename}`}>
<Grid>
<Card onClick={() => openFile(`physics::${filename}`)}>Impulse Physics</Card>
<Card onClick={() => openFile(`vitality::${filename}`)}>Vitality Settings</Card>
<Card onClick={() => openFile(`game_config::${filename}`)}>Game Config</Card>
</Grid>
</ToolFrame>
);
}

4. Verification & Testing

4.1. Manual Verification

System: Open a .cave file → Check dashboard → Navigate to Vitality (SchemaForm) and Game Config (JSON).

Assets: Open a .art file → Check dashboard → Navigate to Resources/Styles. Verify CRUD works for new asset types.

Tooltips: Hover over labels in ImpulseSettingsEditor to verify tooltips appear.

4.2. Automated Tests (View Tests)

Dashboards: Verify correct openFile calls on card clicks.

SchemaField: Verify tooltip prop is correctly parsed and passed to children.
