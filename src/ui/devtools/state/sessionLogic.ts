import { deepClone } from "../../../utils/objectUtils";

export type SessionId = string;
export type SessionScopeId = string;
export type SessionFlushHandler = () => void | Promise<void>;

export interface SessionUiState {
    expandedRows: Record<string, boolean>;
    isIdentityOpen?: boolean;
    isDeleteOpen?: boolean;
    isVisualsOpen?: boolean;
    [key: string]: unknown;
}

export interface Session<TDraft = any> {
    id: SessionId;
    draft: TDraft;
    original: TDraft;

    // Derived/Computed status
    isDirty: boolean;

    // History
    history: {
        past: TDraft[]; // Stack of past states
        future: TDraft[]; // Stack of future states (for redo)
    };

    // UI-only metadata scoped per consumer
    ui: Record<SessionScopeId, SessionUiState>;

    // Flush handlers registered by debounced editors (SchemaForm, etc.)
    flushHandlers: Record<string, SessionFlushHandler>;
}

const MAX_HISTORY = 500;

export function createSession<TDraft = any>(
    id: SessionId,
    initialData: TDraft,
): Session<TDraft> {
    const baseline = deepClone(initialData);
    return {
        id,
        draft: baseline,
        original: deepClone(baseline),
        isDirty: false,
        history: {
            past: [],
            future: [],
        },
        ui: {},
        flushHandlers: {},
    };
}

export function pushToHistory<TDraft>(session: Session<TDraft>) {
    // Save current draft to history
    const snapshot = deepClone(session.draft);

    session.history.past.push(snapshot);
    if (session.history.past.length > MAX_HISTORY) {
        session.history.past.shift();
    }

    // Clear future on new change
    session.history.future = [];
}

export function commitSession<TDraft>(session: Session<TDraft>) {
    session.original = deepClone(session.draft);
    session.isDirty = false;
}

export function discardSession<TDraft>(session: Session<TDraft>) {
    session.draft = deepClone(session.original);
    session.isDirty = false;
    session.history.past = [];
    session.history.future = [];
}

export function applyUndo<TDraft>(session: Session<TDraft>) {
    if (session.history.past.length === 0) return;

    const previous = session.history.past.pop();
    if (!previous) return;

    // Push current to future
    const currentFn = deepClone(session.draft);
    session.history.future.push(currentFn);

    // Apply previous
    session.draft = previous;
    session.isDirty = true;
}

export function applyRedo<TDraft>(session: Session<TDraft>) {
    if (session.history.future.length === 0) return;

    const next = session.history.future.pop();
    if (!next) return;

    // Push current to past
    const currentFn = deepClone(session.draft);
    session.history.past.push(currentFn);

    // Apply next
    session.draft = next;
    session.isDirty = true;
}

