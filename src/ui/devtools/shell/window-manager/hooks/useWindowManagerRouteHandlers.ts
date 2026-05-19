import { createBaseHandlers } from "./useWindowManagerRouteHandlers.base";
import { createConfigHandlers } from "./useWindowManagerRouteHandlers.config";
import { createDraftHandlers } from "./useWindowManagerRouteHandlers.draft";
import { createEntityHandlers } from "./useWindowManagerRouteHandlers.entity";
import { createListHandlers } from "./useWindowManagerRouteHandlers.list";
import type {
    HandlerContext,
    HandlerMap,
} from "./useWindowManagerRouteHandlers.types";

export const createRouteHandlers = (params: HandlerContext): HandlerMap => ({
    ...createBaseHandlers(params),
    ...createConfigHandlers(params),
    ...createDraftHandlers(params),
    ...createListHandlers(params),
    ...createEntityHandlers(params),
});

