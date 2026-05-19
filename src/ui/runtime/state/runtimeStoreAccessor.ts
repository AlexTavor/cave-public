import type {
  RuntimeStoreState,
  RuntimeStoreActions,
} from "./runtimeStoreTypes";

type StorePersistenceProxy = Pick<
  RuntimeStoreState & RuntimeStoreActions,
  "saveGame" | "loadGame" | "currentSaveName" | "availableSaves"
>;

let _getState: () => StorePersistenceProxy = () => {
  throw new Error("Runtime store accessor not initialized");
};

export const registerRuntimeStoreAccessor = (
  getState: () => StorePersistenceProxy,
): void => {
  _getState = getState;
};

export const getRuntimeStore = (): StorePersistenceProxy => _getState();
