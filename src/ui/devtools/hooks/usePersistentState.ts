import { useState, useEffect, useCallback } from "react";

/**
 * A wrapper around useState that persists values to localStorage.
 * Used for "Draft" behavior to survive reloads/crashes.
 * * @param key Unique storage key (e.g. "draft::file::id")
 * @param initialValue Default value if no draft exists
 */
export function usePersistentState<T>(key: string, initialValue: T) {
    // Initialize from storage or default
    const [state, setState] = useState<T>(() => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    // Sync to storage on change
    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(state));
        } catch (error) {
            console.warn(`Error writing localStorage key "${key}":`, error);
        }
    }, [key, state]);

    // Explicit clear function (call this after successful save)
    const clear = useCallback(() => {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.warn(`Error clearing localStorage key "${key}":`, error);
        }
    }, [key]);

    return [state, setState, clear] as const;
}
