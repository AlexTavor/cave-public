Low-Level Design: Butcher Node & Generalized Processing

1. Overview

The Butcher Node is a new station entity that processes biological bodies into resources. Unlike the original Absorption Pool, which converted bodies purely into XP, this system is generalized to support Multi-Resource Processing. A single body can now yield multiple outputs simultaneously—for example, converting its physical mass into Edibles (stored locally) while releasing its soul as XP (dispatched to the global world state).

2. Goals

Multi-Output Support: Allow a single station to produce multiple resources from one input body (e.g., Meat + XP + Bones).

Configurable Sources: Yields are calculated based on data rules (Attribute values, Total Lifetime XP, Fixed amounts), agnostic of the specific output resource ID.

Flexible Routing: Each output resource can be routed to a different target (e.g., Edibles $\rightarrow$ Station Buffer, XP $\rightarrow$ World).

Fast Processing: Support near-instantaneous processing times for the Butcher.

3. Data Schema & Configuration

3.1. Blueprint: station_butcher

The blueprint uses a new processing_outputs state key to define its production rules.

"station_butcher": {
"id": "station_butcher",
"label": "Butcher",
"tags": ["station", "processor"],
"components": {
"display": {
"label": "Butcher",
"icon": "resource_edibles",
"style": "producer_style",
"bars": [
{ "key": "state.absorption_progress", "max": 0.5, "color": "#8BC34A", "label": "Butchering" }
]
},
"state": {
"edibles": { "value": 0, "max": 50, "visible": true },
"absorption_progress": { "value": 0, "visible": true },
"absorption_duration": { "value": 0.5, "visible": true },

            "processing_outputs": {
                "value": [
                    {
                        "resource": "edibles",
                        "source": "fixed",
                        "factor": 124,
                        "target": "self"
                    },
                    {
                        "resource": "xp",
                        "source": "lifetime_xp",
                        "factor": 0.1,
                        "min": 1,
                        "target": "sys_world"
                    }
                ]
            }
        },
        "assignment": { "slots": 1, "locking": true, "assignedIds": [] },
        "physics": { "mass": 100, "radius": 40, "drag": 0.1, "isStatic": true, "x": 500, "y": 700 },
        "behavior": {
            "rules": [
                {
                    "id": "export_meat",
                    "sortKey": "b1",
                    "conditions": [
                        {
                            "tokens": [
                                { "t": "ref", "v": "self.state.edibles.value" },
                                { "t": "op", "v": ">=" },
                                { "t": "val", "v": 5 }
                            ]
                        },
                         {
                            "tokens": [
                                { "t": "ref", "v": "storage_edibles.state.edibles.value" },
                                { "t": "op", "v": "<" },
                                { "t": "ref", "v": "storage_edibles.state.edibles.max" }
                            ]
                        }
                    ],
                    "actions": [
                        {
                            "type": "TRANSFER",
                            "source": "self",
                            "target": "storage_edibles",
                            "resource": "edibles",
                            "amount": 5
                        }
                    ]
                }
            ]
        }
    }

}

3.2. Configuration Contract

The AbsorbBatchHandler looks for state.processing_outputs. If missing, it falls back to a default legacy configuration (XP to World).

Output Definition Schema:

interface ProcessingOutput {
resource: string; // Output Resource ID (e.g., "xp", "edibles")
source: "attribute" | "lifetime_xp" | "fixed"; // Determines calculation logic
attribute?: "body" | "mind" | "social"; // Required if source="attribute"
factor?: number; // Multiplier (Default: 1)
min?: number; // Minimum yield (Default: 0)
target?: "self" | "sys_world" | string; // Target Entity ID (Default: "sys_world")
}

4. System Logic Changes

4.1. src/game/handlers/AbsorbBatchHandler.ts

Responsibility: Execute the conversion of proxies into multiple resource bundles.

Logic Update:

Resolve Configuration:

Read state.processing_outputs.value.

If missing/invalid, use default: [{ resource: "xp", source: "lifetime_xp", factor: 1, target: "sys_world" }] (mimicking legacy behavior).

Iterate Proxies:
For each assigned proxy/body:

Iterate Outputs: For each outputConfig in the configuration array:

Calculate Yield: Call resolveOutputAmount(body, outputConfig).

Resolve Target:

"self" $\rightarrow$ Station ID.

"sys_world" $\rightarrow$ World ID.

Other $\rightarrow$ Treat as exact Entity ID.

Spawn Visuals:

Call spawnYieldSpectacle for each output.

This creates multiple transfer nodes (e.g., Meat flying to the Butcher, XP orbs flying to the Cave).

Cleanup:

Destroy proxies.

Reset station progress.

4.2. src/game/handlers/absorptionBatchUtils.ts

Responsibility: Calculation logic.

New Functions:

calculateLifetimeXp(body: BodyComponent): number

Sum of XP required for all completed levels (1 to currentLevel - 1).

Add current body.xp.

Note: Requires importing resolveXpThreshold from body/progression.ts.

resolveOutputAmount(body: BodyComponent, config: ProcessingOutput): number

Switch on config.source:

attribute:

Value = body.attributes[config.attribute] ?? 0.

lifetime_xp:

Value = calculateLifetimeXp(body).

fixed:

Value = 1.

Apply Factor: Value = Value \* (config.factor ?? 1).

Apply Min: Value = Math.max(config.min ?? 0, Value).

Return Math.floor(Value).

5. Implementation Plan

5.1. Update absorptionBatchUtils.ts

Implement the XP math and the generic resolver.

export const resolveOutputAmount = (body: BodyComponent, config: ProcessingOutput): number => {
let baseValue = 0;

    if (config.source === "attribute" && config.attribute) {
        const attrs = body.attributes ?? body.baseAttributes;
        baseValue = attrs?.[config.attribute] ?? 0;
    } else if (config.source === "lifetime_xp") {
        baseValue = calculateLifetimeXp(body);
    } else if (config.source === "fixed") {
        baseValue = 1;
    }

    const factor = config.factor ?? 1;
    const min = config.min ?? 0;

    return Math.max(min, Math.floor(baseValue * factor));

};

5.2. Update AbsorbBatchHandler.ts

Refactor the loop to handle the configuration array.

// Inside loop
const outputs = resolveOutputs(station); // Returns ProcessingOutput[]

for (const outputConfig of outputs) {
const amount = resolveOutputAmount(body, outputConfig);
if (amount <= 0) continue;

    const targetId = resolveTargetId(station, outputConfig.target);
    // ... spawn spectacle ...

}

6. Testing

6.1. Unit Tests

Legacy Compatibility: Verify entities without processing_outputs still produce XP via lifetime_xp default logic.

Source Type Coverage:

Fixed:

Config: { resource: "meat", source: "fixed", factor: 124 }

Expect: Yield = 124.

Attribute:

Config: { resource: "power", source: "attribute", attribute: "body", factor: 2.5 }

Body: attributes.body = 10

Expect: Yield = 25.

Lifetime XP:

Config: { resource: "essence", source: "lifetime_xp", factor: 0.5 }

Body: Level 2 (Level 1 cost 100) + 10 current XP = 110 Total.

Expect: Yield = 55.

Multi-Output Logic:

Combine the above configurations into a single array.

Verify multiple transfer commands are queued targeting the correct destinations.

6.2. Integration

Verify visual feedback: Do two distinct streams of particles appear? (One to station, one to world).
