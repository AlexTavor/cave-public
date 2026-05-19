export function setByPath(obj: any, path: string, value: any) {
    if (!path) return;
    const keys = path.split(".");
    const lastKey = keys.pop();
    if (!lastKey) return;
    let current = obj;
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const nextKey = keys[i + 1];
        const nextIsIndex = Number.isInteger(Number(nextKey));

        if (Array.isArray(current) && Number.isInteger(Number(key))) {
            const index = Number(key);
            current[index] ??= nextIsIndex ? [] : {};
            current = current[index];
            continue;
        }

        current[key] ??= nextIsIndex ? [] : {};
        current = current[key];
    }
    if (Array.isArray(current) && Number.isInteger(Number(lastKey))) {
        current[Number(lastKey)] = value;
        return;
    }
    current[lastKey] = value;
}

export function getByPath(obj: any, path: string) {
    if (!path || path === "") return obj;
    const keys = path.split(".");
    let current = obj;
    for (const key of keys) {
        if (current === undefined || current === null) return undefined;
        current = current[key];
    }
    return current;
}

export function deleteByPath(obj: any, path: string) {
    if (!path) return;
    const keys = path.split(".");
    const lastKey = keys.pop();
    if (!lastKey) return;
    const parent = getByPath(obj, keys.join("."));
    if (parent === undefined || parent === null) return;
    if (Array.isArray(parent) && Number.isInteger(Number(lastKey))) {
        parent.splice(Number(lastKey), 1);
        return;
    }
    delete parent[lastKey];
}

export function deepClone<T>(data: T): T {
    if (typeof structuredClone === "function") {
        try {
            return structuredClone(data);
        } catch {
            // Fallback if structuredClone fails (e.g. on Proxies)
        }
    }
    return JSON.parse(JSON.stringify(data));
}

export function deepMerge(target: any, source: any): any {
    for (const key in source) {
        if (
            source[key] &&
            typeof source[key] === "object" &&
            !Array.isArray(source[key])
        ) {
            if (
                !target[key] ||
                typeof target[key] !== "object" ||
                Array.isArray(target[key])
            ) {
                target[key] = {};
            }
            deepMerge(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
}

