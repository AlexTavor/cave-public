/**
 * Normalizes a list of string ids: drops falsy entries, dedupes, and sorts
 * lexically. The lexical sort makes the output order stable, so anything that
 * persists or hashes these lists (owned habiti/understanding, known habiti)
 * stays replay-deterministic. Pure leaf — no engine/game deps — so both the
 * engine command handlers and game systems can share the single normalization.
 */
export const normalizeHabitiIds = (ids: string[]) =>
    [...new Set(ids.filter(Boolean))].sort((left, right) =>
        left.localeCompare(right),
    );
