// A simple immutable Todo list manager in TypeScript
// Utility types for better type safety
export type Optional<T> = T | undefined;
export type Result<T, E> = { success: true; value: T; } | { success: false; error: E; };
export interface Todo {
    id: number;
    title: string;
    description: Optional<string>;
    completed: boolean;
}