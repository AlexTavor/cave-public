import type { ShowCinematicCommand } from "../types";
import { RuntimeCommandType } from "../types";
import type { CommandHandler, CommandHandlerContext } from "./types";

export class ShowCinematicHandler implements CommandHandler<ShowCinematicCommand> {
    public readonly type = RuntimeCommandType.SHOW_CINEMATIC;

    public handle(
        _command: ShowCinematicCommand,
        _context: CommandHandlerContext,
    ): void {
        return;
    }
}
