export type RuntimeLike = {
  getEntity?: (id: string) => any;
  getEntities?: () => readonly any[];
  getInvalidation?: () => any;
};

export type InternalBarBinding = {
  element: HTMLElement;
  entityId: string;
  maxResolver?: (entity: any) => unknown;
  maxValue?: number;
  valueResolver: (entity: any) => unknown;
};
