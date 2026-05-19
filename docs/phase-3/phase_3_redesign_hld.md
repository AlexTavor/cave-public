High-Level Design: Unified Behavior System

Status: Draft

Scope: Editor Architecture & UX

Context: Phase 3 Refactor

1. Executive Summary

1.1 The Problem: Bucket-First Design

The current Editor architecture suffers from Schema-Driven Design, forcing users to understand the underlying ECS implementation (TriggerComponent vs LogicComponent vs FlowComponent) before expressing game logic. This creates high cognitive load, context switching, and prevents fluid refactoring between continuous logic and discrete events. Users are currently acting as "Database Administrators" rather than "Game Designers."

1.2 The Solution: Intent-Driven Design

We will transition to an Intent-Driven editing experience. The disparate editor tabs ("Logic", "Trigger", "Flow") will be replaced by a single "Behaviors" interface.

The Editor will act as a smart compiler/facade, routing user intent to the correct underlying ECS component based on the Semantic Verb used in the rule (e.g., WHEN routes to Triggers, SET routes to Logic, GIVE routes to Flow).

2. Conceptual Model

We introduce a unified Behavior concept at the Editor layer, abstracting away the ECS storage complexity.

2.1 The Unified Grammar

All game logic is expressed via a standardized Subject-Verb-Object grammar. The Verb determines the execution context (Continuous vs. Event) and the transaction type (Mutation vs. Transport).

Verb Categories & Routing Table

Category

Verbs

Execution Timing

Target ECS Component

Triggers

WHEN

Event-Driven (Discrete)

TriggerComponent

Mutation

SET, ADD, SUB, MULT, DIV

Continuous (Every Tick)

LogicComponent

Transport

GIVE, TAKE

Continuous (Every Tick)

FlowComponent

Lifecycle

SPAWN, KILL, MORPH

Event-Driven (Effect)

TriggerComponent

Meta

TELL, LOG, PAUSE

Event-Driven (Effect)

TriggerComponent

Note: IF is a conditional modifier available to all continuous verbs, not a verb itself.

3. Architecture Changes

3.1 Data Model (Runtime Schema)

We will maintain the separation of TriggerComponent, LogicComponent, and FlowComponent in the ECS schema. This preserves runtime performance optimization (Tier 1 vs Tier 2 execution phases) and adheres to the "Generic Data-Driven Engine" requirements.

Key Constraint: The unification happens strictly in the Editor Layer, not the Runtime Layer.

3.2 Editor Layer: The Behavior Facade

A new abstraction layer will sit between the UI state and the raw ECS Draft state.

Responsibilities

Aggregation (Read): On load, the Facade queries the entity draft for trigger, logic, and flow components. It flattens their rules into a single VirtualRuleList, preserving a stable ID for UI rendering.

Routing (Write): When a rule is modified, the Facade parses the First Token (The Verb):

If WHEN $\rightarrow$ Write to TriggerComponent.rules.

If GIVE/TAKE $\rightarrow$ Write to FlowComponent.rules.

If SET/ADD $\rightarrow$ Write to LogicComponent.rules.

Component Lifecycle Management:
The user never manually adds or removes components.

Auto-Creation: If a user types a WHEN rule, the Facade automatically adds the TriggerComponent to the blueprint if it doesn't exist.

Auto-Garbage Collection: If the last WHEN rule is deleted or refactored to a SET rule, the Facade automatically removes the TriggerComponent from the blueprint to keep the data clean.

4. UI/UX Strategy

4.1 The Unified Behavior Card

The separate Editor cards for Logic, Flow, and Triggers will be replaced by a single Behaviors card.

List View: Displays all rules in a unified list.

Visual Cues: Subtle iconography or color-coding (e.g., "⚡" for Events, "🌊" for Flow, "∞" for Continuous) indicates the rule's nature, but they live side-by-side.

4.2 Structured Sentence Input 2.0

The StructuredSentenceInput component will be updated to support Verb-First Autocomplete.

Empty State: When focusing a new rule, the autocomplete dropdown suggests Verbs first, categorized by intent:

Events: WHEN

State: SET, ADD, SUB

Flow: GIVE, TAKE

Refactoring: Changing the first token from SET to WHEN immediately triggers the Facade to move the rule from one underlying storage bucket to another, preserving the rest of the sentence where possible.

5. Implementation Plan

Phase 1: The Facade Hooks (useEntityBehaviors)

Develop the hook that acts as the middleware.

Input: The Entity Blueprint Draft.

Output: A unified rules[] array and CRUD methods (addRule, updateRule, deleteRule).

Logic: Implements the routing table and component lifecycle management.

Phase 2: Schema Vocabulary Expansion

Update LogicToken definitions to formally support the new verbs (GIVE, TAKE, MORPH).

Ensure the JsonLogicAdapter (Runtime) supports the implementation of these verbs (mapping GIVE to the underlying logic required for resource transfer).

Phase 3: UI Integration

Swap the UI components in BlueprintEditor to use the new Behaviors view.

Retire the legacy isolated Logic/Trigger editors.

6. Migration & Compatibility

Data Migration: None required. The underlying storage format (.json blueprints) remains identical. The change is purely in how the data is presented and authored.

Legacy Loading: Opening an older entity will work seamlessly; the Facade will simply aggregate existing rules into the new list.

7. Risks & Mitigations

Risk: Rule ID collision when moving between components.

Mitigation: Ensure the VirtualRuleList uses stable UUIDs. When a rule "hops" components (e.g., Logic $\to$ Trigger), it should ideally retain its conceptual identity/ID to preserve editor selection state.

Risk: User confusion regarding execution order.

Mitigation: The UI should strictly order the Unified List to reflect the Runtime's execution phases (e.g., Logic $\to$ Triggers), or explicitly label them if sorting is user-defined.
