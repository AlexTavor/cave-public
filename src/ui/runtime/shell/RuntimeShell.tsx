import { ErrorBoundary } from "./ErrorBoundary";
import { GameWorldAdapter } from "../world/context/GameWorldAdapter";
import { RuntimeShellCanvas } from "./RuntimeShellCanvas";

export interface RuntimeShellProps {
    chrome?: "full" | "minimal";
    hiddenUntilTick?: number;
}

export const RuntimeShell: React.FC<RuntimeShellProps> = ({
    chrome = "full",
    hiddenUntilTick = 2,
}) => {
    return (
        <GameWorldAdapter>
            <ErrorBoundary>
                <RuntimeShellCanvas
                    chrome={chrome}
                    hiddenUntilTick={hiddenUntilTick}
                />
            </ErrorBoundary>
        </GameWorldAdapter>
    );
};

