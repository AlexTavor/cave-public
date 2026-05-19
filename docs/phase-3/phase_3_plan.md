Phase 3: The Engine (Simulation & Logic)

Status: Locked (Architectural Accord Reached)
Focus: Generic Logic Processor, Trigger Events, Simulation Loop, Structured Editor
Context: Context Pack v1, Phase 3 Master Plan

1. Summary

Phase 3 transitions the Runtime from a passive container to an active, deterministic simulation. We are implementing a Generic Data-Driven Engine composed of two fundamental systems: Continuous Logic (Flow) and Discrete Events (Triggers).

The "What"

The Two-Tier Logic Architecture: To prevent performance degradation ($O(N^2)$ query bombs), logic is split into two strict contexts:

Tier 1 (The Cortex): World-level logic. Runs once per tick. Can perform expensive queries (count, sum, filter). Outputs to state.globals (stored in a singleton sys_world entity).

Tier 2 (The Reflex): Entity-level logic. Runs $N$ times per tick. Cannot query the world. Can only read self, slots, and globals. Outputs to self.state.

The Structured Editor (Projectional): We will not write a text parser.
The Logic Editor looks like a text field but behaves like a code builder. It constructs a linear stream of JSON tokens (TOKEN_REF, TOKEN_OP, TOKEN_VAL). This ensures 100% valid data at authoring time and enables "Comfy" auto-formatting without regex fragility.

The Physics Kernel: The ImpulseEngine is a privileged kernel process that runs before the Logic phase, ensuring the Snapshot reflects the latest physical reality.

2. Architectural Overview

The Runtime Tick Loop is reorganized to support the Logic/Trigger pipeline with explicit snapshot semantics and guardrails.

The Updated Tick Loop

Apply Phase (Mutative):

CommandsManager drains the buffer and mutates the ECS World (Spawn, Kill, State updates).

Physics Kernel: ImpulseEngine steps the simulation (Verlet integration). This mutates positions/velocities directly for performance.

Read Phase (Snapshot):

Build an Immutable Snapshot of the world.

Memoization: The snapshot initializes an empty queryCache Map. The first time a specific query (e.g., tag:worker) is executed by Tier 1 Logic, the result is cached for the duration of the tick.

System Phase (Read-Only / Emission):

World Logic (Tier 1): Reads Snapshot. Calculates globals. Emits SET_GLOBAL commands.

Entity Logic (Tier 2): Iterates entities. Reads Snapshot + Globals. Emits state commands.

Trigger System: Checks conditions. Emits effect commands (Spawn, Kill, Transfer).

Collect Phase: Buffer emitted commands.

Safety Valve: If command count > MAX_COMMANDS_PER_TICK, CRASH the ticker (Safe Mode) and alert the user. No silent drops.

Advance Phase: Tick increment.

Data Flow

graph TD
A[Command Buffer] -->|Apply| B(ECS World)
B -->|Step| C(Physics Kernel)
C -->|Freeze| D[Snapshot + QueryCache]

    D -->|Read| E(World Logic)
    E -->|SET_GLOBAL| F[Command Buffer]

    D -->|Read| G(Entity Logic)
    G -->|UPDATE_STATE| F

    D -->|Read| H(Trigger System)
    H -->|SPAWN/KILL/TRANSFER| F

3. Low-Level Design (LLD)

3.1. Data Schema: Structured Logic

Instead of storing raw strings, we store a Token Stream to support the Projectional Editor.

// Mental Model of stored data
type LogicToken =
| { t: "keyword", v: "WHEN" | "IF" | "DO" | "AND" | "SET" | "ELSE" }
| { t: "ref", v: "self.stats.hp" } // References are IDs, not just text
| { t: "op", v: ">" | "=" | "ADD" | "SUB" }
| { t: "val", v: number }; // State is strictly numeric (1/0 for bools)

type LogicRule = {
tokens: LogicToken[]; // The source of truth for the Editor
compiled?: JsonLogic; // Optional: Optimization (generated on save)
};

3.2. JsonLogic Adapter (Tiered)

Wrapper around json-logic-js.

Features:

Context Awareness: The evaluator accepts a mode flag ('world' | 'entity').

Restricted Operators: If mode === 'entity', the query() operator throws a loud error.

Slot Abstraction: A special slot(name) operator is available in Entity mode to efficiently iterate AssignmentComponent arrays without world queries.

Numeric Enforcement: State values are strictly numbers. Boolean logic (comparisons) must resolve to numbers (1 or 0) when stored.

3.3. Snapshot & Memoization

The Snapshot object passed to systems must proxy the ECS to prevent mutation and handle caching.

snapshot.query(selector):

Check cache.has(selector). Return hit if found.

Resolve selector via Miniplex archetypes (Tag match) or filter (Prop match).

Store in cache.

Return frozen array.

3.4. UX: The Sentence Builder

A new UI component StructuredSentenceInput replacing SmartInput for Logic fields.

Interaction Model:

Typing: Input matches against known schema (self._, global._).

Creation (Vocabulary Builder):

If user types global.mana and it does not exist, the Autocomplete Dropdown displays a special action: ✨ Define 'mana' on World.

Selecting this action immediately mutates the sys_world blueprint to add the number field, then inserts the valid token.

Same applies to self.\* (adds to current blueprint).

Grammar & Formatting:

Trigger System:

Grammar: WHEN [Condition] DO [Command]

Formatting: DO forces a new line + indent.

Logic System:

Grammar: SET [Target] = [Formula]

Formula supports IF [Cond] THEN [Val] ELSE [Val].

Formatting: Single line unless IF/ELSE is used.

Visuals:

Gold Pills: Global references.

White Pills: Local references.

Complexity Check: If > 3 ANDs are detected, show warning icon.

4. Guardrails (Required)

These are hard requirements to ensure stability and performance.

4.1. The "Safety Valve" (Anti-Loop)

If the Command Buffer exceeds its budget (e.g., 2000 commands/tick):

Halt: Stop the Ticker immediately.

Alert: Show a modal "Simulation Halted: Command Overflow".

Debug: Dump the command types causing the overflow to the Terminal.

Forbid: Do not process partial commands.

4.2. Strict Query Isolation

Entity Logic cannot query the world. It can only look at itself, its parents (slots), or globals.

Reason: Prevents $O(N^2)$ complexity growth.

4.3. Physics Isolation

Physics runs outside the System Phase.

Logic cannot "react" to physics changes happening in the same tick. It always sees the state at the start of the System Phase.

5. Implementation Steps

5.1. Core Engine

Runtime Loop Refactor: Move ImpulseEngine to Apply Phase. Implement Snapshot with queryCache.

Safety Valve: Implement the budget check and "Emergency Stop" in Runtime.tick.

Evaluator: Implement JsonLogicAdapter with Tiered permissions (world vs entity) and Slot support.

5.2. UI & Editor

Token Schema: Update Zod schemas to support LogicRule (Token Stream).

Vocabulary Infrastructure: Ensure sys_world blueprint exists (or create on boot).

Sentence Component: Create StructuredSentenceInput (Projectional Editor).

Implement Token rendering.

Implement "Create-on-the-fly" in autocomplete.

Logic Editor: Integrate the new component into the Blueprint Editor.

5.3. Systems

LogicSystem: Hydrate Token Streams into JsonLogic. Execute Tier 2 logic (Continuous SET).

TriggerSystem: Execute Tier 2 triggers (WHEN).

WorldSystem: (New) Execute Tier 1 logic to compute Globals (SET_GLOBAL).

6. Verification Plan

6.1. Unit Tests

Memoization: Verify snapshot.query is called multiple times but underlying ECS query runs once.

Tier Enforcement: Verify query() throws when evaluator is in entity mode.

Safety Valve: Mock a system emitting infinite commands; verify Runtime halts and throws.

6.2. Visual/UX Tests

Editor Flow: Type WHEN self.hp < 10 DO SET self.flee 1. Verify tokens are created.

Vocabulary Builder: Type self.new_stat, select "Create", verify field appears in Passport/Schema.

Refactoring: Rename a variable in the schema; verify the Token (which stores the ID) still resolves.

6.3. Simulation Test (cycle.cvs)

Create a script that sets up a closed loop:

World Logic: SET global.total_wood = SUM(query(tag:wood), "value")

Producer: IF global.total_wood < 100 DO ADD self.wood 1

Consumer: IF self.wood > 0 DO SUB self.wood 1

Verify the loop stabilizes and global.total_wood updates correctly in the telemetry.
