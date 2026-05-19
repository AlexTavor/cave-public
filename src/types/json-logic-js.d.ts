declare module "json-logic-js" {
    const jsonLogic: {
        add_operation: (name: string, fn: (...args: any[]) => any) => void;
        apply: (logic: any, data: any) => any;
        truthy?: (value: any) => boolean;
    };
    export default jsonLogic;
}
