import type { CommandBuffer, RuntimeCommand } from "./types";
import { RuntimeCommandType } from "./types";
import type { CommandHandler, CommandHandlerContext } from "./handlers/types";
import { recordAppliedCommandType } from "./debug/runtimeActivityStats";

export class CommandsManager implements CommandBuffer<RuntimeCommand> {
    private readonly handlers = new Map<
        RuntimeCommandType,
        CommandHandler<RuntimeCommand>
    >();
    private buffer: RuntimeCommand[] = [];
    private spareBuffer: RuntimeCommand[] = [];

    public registerHandler<TCommand extends RuntimeCommand>(
        handler: CommandHandler<TCommand>,
    ): void {
        this.handlers.set(
            handler.type,
            handler as CommandHandler<RuntimeCommand>,
        );
    }

    public enqueue(command: RuntimeCommand): void {
        this.buffer.push(command);
    }

    public drain(): RuntimeCommand[] {
        const drained = this.buffer;
        this.buffer = this.spareBuffer;
        this.buffer.length = 0;
        this.spareBuffer = drained;
        return drained;
    }

    public clear(): void {
        this.buffer.length = 0;
    }

    public size(): number {
        return this.buffer.length;
    }

    public process(context: CommandHandlerContext): RuntimeCommand[] {
        const processed: RuntimeCommand[] = [];

        while (this.size() > 0) {
            const commands = this.drain();
            processed.push(...commands);

            for (const command of commands) {
                recordAppliedCommandType(command.type);
                const handler = this.handlers.get(command.type);
                if (!handler) {
                    context.telemetry.log(
                        "errors",
                        `No handler registered for '${command.type}'.`,
                    );
                    continue;
                }

                handler.handle(command, context);
            }
        }

        return processed;
    }
}

