import { Button } from "../../../../../lib/atoms/button";

export const ExplorerButton = () => {
    // Current layout doesn't support explicit "Navigating back" as it's a window manager.
    // Keeping it as a placeholder consistent with UI requirements.
    return (
        <Button size="sm" variant="ghost">
            Explorer
        </Button>
    );
};
