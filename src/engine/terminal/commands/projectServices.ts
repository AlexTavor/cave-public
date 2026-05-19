import { ModuleLinker } from "../../linker/ModuleLinker";
import { Gatekeeper } from "../../linker/Gatekeeper";
import { vfs } from "../../vfs/FileSystem";
import { RefactorService, WorkspaceService } from "../../workspace";

const linker = new ModuleLinker(vfs);

export const workspaceService = new WorkspaceService(vfs, linker);
export const refactorService = new RefactorService(workspaceService, vfs);
export const gatekeeper = new Gatekeeper(linker);
