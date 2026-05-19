import { create } from "zustand";

export interface ToastItem {
    id: string;
    type: "success" | "info" | "error";
    message: string;
}

interface ToastState {
    items: ToastItem[];
    push: (type: ToastItem["type"], message: string) => void;
    remove: (id: string) => void;
}

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const useToastStore = create<ToastState>()((set) => ({
    items: [],
    push: (type, message) =>
        set((state) => ({
            items: [...state.items, { id: createId(), type, message }],
        })),
    remove: (id) =>
        set((state) => ({
            items: state.items.filter((item) => item.id !== id),
        })),
}));
