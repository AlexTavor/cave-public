export interface InteractionState {
    /**
     * Whether game input is currently blocked by UI interactions
     */
    isInputBlocked: boolean;

    /**
     * Stack of active input blockers (for debugging and nested modals)
     */
    activeBlockers: string[];

    /**
     * Register a new input blocker
     * @param reason - Description of why input is being blocked
     * @returns Cleanup function to remove the blocker
     */
    blockInput: (reason: string) => () => void;

    /**
     * Manually unblock input by reason
     * @param reason - The reason string used when blocking
     */
    unblockInput: (reason: string) => void;
}
