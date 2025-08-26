// A simple immutable Todo list manager in TypeScript

// Utility types for better type safety
type Optional<T> = T | undefined;
type Result<T, E> = { success: true; value: T } | { success: false; error: E };

interface Todo {
    id: number;
    title: string;
    description: Optional<string>;
    completed: boolean;
}

// Immutable TodoManager class
class TodoManager {
    // The todos array is private and readonly to prevent direct mutation from
    // outside. It should never be reassigned.
    private readonly todos: ReadonlyArray<Todo>;
    private nextId: number = 1;

    // Use a constructor to initialize the state.
    constructor(todos: ReadonlyArray<Todo> = []) {
        this.todos = todos;
    }

    addTodo(title: string, description?: string): TodoManager {
        const newTodo: Todo = {
            id: this.nextId,
            title,
            description: description,
            completed: false,
        };
        return new TodoManager([...this.todos, newTodo]).withNextId(
            this.nextId + 1
        );
    }

    // Helper method for the constructor to set the nextId, making internal
    // updates cleaner
    private withNextId(nextId: number): TodoManager {
        const newManager = new TodoManager(this.todos);
        newManager.nextId = nextId;
        return newManager;
    }

    getTodos(): ReadonlyArray<Todo> {
        // Return the existing immutable todos array.
        return this.todos;
    }

    getTodoById(id: number): Result<Todo, string> {
        const todo = this.todos.find((t) => t.id === id);
        if (!todo) {
            return { success: false, error: "Todo not found" };
        }
        return { success: true, value: todo };
    }

    markCompleted(id: number): Result<TodoManager, string> {
        const index = this.todos.findIndex((t) => t.id === id);
        if (index === -1) {
            return { success: false, error: "Todo not found" };
        }
        const todo = this.todos[index];
        if (todo.completed) {
            return { success: false, error: "Todo already completed" };
        }

        // Create a new todo object with the updated 'completed' property.
        const updatedTodo: Todo = { ...todo, completed: true };

        const newTodos = [
            ...this.todos.slice(0, index),
            updatedTodo,
            ...this.todos.slice(index + 1),
        ];
        return { success: true, value: new TodoManager(newTodos) };
    }

    removeTodo(id: number): Result<TodoManager, string> {
        const index = this.todos.findIndex((t) => t.id === id);
        if (index === -1) {
            return { success: false, error: "Todo not found" };
        }

        // Return a NEW TodoManager instance with the todo removed.
        const newTodos = [
            ...this.todos.slice(0, index),
            ...this.todos.slice(index + 1),
        ];
        return { success: true, value: new TodoManager(newTodos) };
    }

    updateTodo(
        id: number,
        newData: Partial<Todo>
    ): Result<TodoManager, string> {
        const index = this.todos.findIndex((t) => t.id === id);
        if (index === -1) {
            return { success: false, error: "Todo not found" };
        }

        const oldTodo = this.todos[index];
        const updatedTodo: Todo = { ...oldTodo, ...newData };

        // Return a NEW TodoManager instance with the todo updated.
        const newTodos = [
            ...this.todos.slice(0, index),
            updatedTodo,
            ...this.todos.slice(index + 1),
        ];
        return { success: true, value: new TodoManager(newTodos) };
    }
}

function sanitizeInput(input: string): string {
    return input.trim();
}

async function takeInput(prompt: string): Promise<string> {
    process.stdout.write(prompt);
    for await (const line of console) {
        const sanitized = sanitizeInput(line);
        if (sanitized === "") {
            console.log("Empty input is not allowed.");
        } else {
            return sanitized;
        }
    }
    throw new Error("Input stream ended unexpectedly");
}

