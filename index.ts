var readlineSync = require("readline-sync")

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

    /**
     * The function `consolidateIds` takes an array of `Todo` objects and returns a new array with updated
     * `id` values based on the index position.
     * @param todos - An array of Todo objects.
     * @returns A new array of todos is being returned where each todo object has its id property updated
     * to be the index of the todo in the original array plus 1.
     */
    static consolidateIds(todos: ReadonlyArray<Todo>): ReadonlyArray<Todo> {
        return todos.map((todo, index) => ({ ...todo, id: index + 1 }));
    }

    // Use a constructor to initialize the state.
    constructor(todos: ReadonlyArray<Todo> = [], nextId?: number) {
        this.todos = TodoManager.consolidateIds(todos);
    }

    /**
     * The `addTodo` function creates a new todo item with a given title and optional description, sets its
     * completion status to false, and adds it to the list of todos in a TodoManager instance.
     * @param {string} title - The `title` parameter is a required parameter of type `string` that
     * represents the title of the todo item to be added.
     * @param {string} [description] - The `description` parameter in the `addTodo` function is an optional
     * parameter of type `string`. This means that it is not required to provide a value for the
     * `description` when calling the function. If a value is provided, it should be a string that
     * describes the details of the todo
     * @returns The `addTodo` function is returning a new instance of `TodoManager` with an updated list of
     * todos that includes the newly added todo item, and an incremented `nextId` value.
     */
    addTodo(title: string, description?: string): TodoManager {
        const newTodo: Todo = {
            id: this.nextId,
            title,
            description,
            completed: false,
        };
        return new TodoManager([...this.todos, newTodo], this.nextId + 1);
    }

    getTodos(): ReadonlyArray<Todo> {
        // Return the existing immutable todos array.
        return this.todos;
    }

    toString() {
        return this.todos.map(todo => `${todo.id}: ${todo.title} - ${todo.completed ? "✓" : "✗"}`).join("\n");
    }

    toStringLong() {
        return this.todos.map(todo => {
            return `ID: ${todo.id}\nTitle: ${todo.title}\nDescription: ${todo.description || "N/A"}\nCompleted: ${todo.completed ? "Yes" : "No"}`;
        }).join("\n\n");
    }

    getTodoById(id: number): Result<Todo, string> {
        const todo = this.todos.find((t) => t.id === id);
        if (!todo) {
            return { success: false, error: "Todo not found" };
        }
        return { success: true, value: todo };
    }

    /**
     * The function `markCompleted` updates the completion status of a todo item in a TodoManager object
     * and returns a new TodoManager instance with the updated todo list.
     * @param {number} id - The `id` parameter in the `markCompleted` method is the unique identifier of
     * the todo item that you want to mark as completed.
     * @returns The `markCompleted` method returns a `Result` object with a generic type `TodoManager` and
     * a string. The `Result` object contains either a success or error message. If the operation is
     * successful, it returns a new `TodoManager` instance with the updated todo list. If there is an error
     * (e.g., todo not found or todo already completed), it returns an error message
     */
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
        return { success: true, value: new TodoManager(newTodos, this.nextId) };
    }

    removeTodo(id: number): Result<TodoManager, string> {
        const index = this.todos.findIndex((t) => t.id === id);
        if (index === -1) {
            return { success: false, error: "Todo not found" };
        }

        // Return a NEW TodoManager instance with the todo removed.
        // Also, update the id such that there are no gaps in the sequence.
        const remainingTodos = [
            ...this.todos.slice(0, index),
            ...this.todos.slice(index + 1),
        ];

        // Renumber the remaining todos starting from 1
        const renumberedTodos = remainingTodos.map((todo, i) => ({ ...todo, id: i + 1 }));

        // Calculate the correct nextId based on the renumbered todos
        const newNextId = renumberedTodos.length > 0 ? Math.max(...renumberedTodos.map(todo => todo.id)) + 1 : 1;

        return { success: true, value: new TodoManager(renumberedTodos, newNextId) };
    }

    /**
     * The function `updateTodo` updates a todo item in a TodoManager instance while preventing changes to
     * the ID field.
     * @param {number} id - The `id` parameter is the unique identifier of the todo item that you want to
     * update. It is used to find the specific todo item in the list of todos.
     * @param newData - The `newData` parameter in the `updateTodo` function is an object that contains
     * updated information for a todo item. The `Omit<Partial<Todo>, 'id'>` type indicates that the
     * `newData` object should have properties that are part of the `Todo` type but
     * @returns The `updateTodo` method returns a `Result` object containing either a new `TodoManager`
     * instance with the updated todo if the operation is successful, or an error message if the todo with
     * the specified ID is not found.
     */
    updateTodo(
        id: number,
        newData: Omit<Partial<Todo>, 'id'>  // Prevent ID updates
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

function handleTodoCreation(manager: TodoManager): Result<TodoManager, string> {
    const title = readlineSync.question("Enter todo title: ");
    if (!title.trim()) {
        return { success: false, error: "Title cannot be empty" };
    }
    const description = readlineSync.question("Enter todo description (optional): ");

    const updatedManager = manager.addTodo(title, description || undefined);
    console.log(`Added todo: ${title}`);
    return { success: true, value: updatedManager };
}

function handleTodoUpdate(manager: TodoManager): Result<TodoManager, string> {
    const id = parseInt(readlineSync.question("Enter todo ID to update: "));
    const title = readlineSync.question("Enter new todo title (leave blank to keep current): ");
    const description = readlineSync.question("Enter new todo description (leave blank to keep current): ");

    if (!title.trim() && !description.trim()) {
        return { success: false, error: "No changes made" };
    }

    const result = manager.updateTodo(id, {
        title: title.trim() || undefined,
        description: description.trim() || undefined
    });

    if (result.success) {
        console.log(`Updated todo ID ${id}`);
        return { success: true, value: result.value };
    } else {
        return { success: false, error: result.error };
    }
}

function handleTodoRemove(manager: TodoManager): Result<TodoManager, string> {
    const id = parseInt(readlineSync.question("Enter todo ID to remove: "));
    const result = manager.removeTodo(id);
    if (result.success) {
        console.log(`Removed todo ID ${id}`);
        return { success: true, value: result.value };
    } else {
        return { success: false, error: result.error };
    }
}

function handleCompleteTodo(manager: TodoManager): Result<TodoManager, string> {
    const id = parseInt(readlineSync.question("Enter todo ID to mark as complete: "));
    const result = manager.markCompleted(id);
    if (result.success) {
        console.log(`Marked todo ID ${id} as complete`);
        return { success: true, value: result.value };
    } else {
        return { success: false, error: result.error };
    }
}

const allowedCommands = ["add", "view", "update", "complete", "remove", "help", "quit"];
const helpText = `
Available commands:
- add: Add a new todo
- view: View all todos
- update: Update an existing todo
- complete: Mark a todo as complete
- remove: Remove a todo
- help: Show this help message
- quit: Exit the application
`;


function main() {
    let todoManager = new TodoManager();
    let isRunning = true;

    console.log("Welcome to the Todo App!");
    console.log(helpText);

    while (isRunning) {
        const action = readlineSync.question("Enter action: ");
        if (!allowedCommands.includes(action)) {
            console.log("Invalid command. Type 'help' for a list of commands.");
            continue;
        }
        switch (action) {
            case "add":
                const result = handleTodoCreation(todoManager);
                if (result.success) {
                    todoManager = result.value;
                } else {
                    console.log("Error adding todo:", result.error);
                }
                break;
            case "update":
                const updateResult = handleTodoUpdate(todoManager);
                if (updateResult.success) {
                    todoManager = updateResult.value;
                } else {
                    console.log("Error updating todo:", updateResult.error);
                }
                break;
            case "complete":
                const completeResult = handleCompleteTodo(todoManager);
                if (completeResult.success) {
                    todoManager = completeResult.value;
                } else {
                    console.log("Error completing todo:", completeResult.error);
                }
                break;
            case "remove":
                const removeResult = handleTodoRemove(todoManager);
                if (removeResult.success) {
                    todoManager = removeResult.value;
                } else {
                    console.log("Error removing todo:", removeResult.error);
                }
                break;
            case "view":
                if (todoManager.getTodos().length > 0) {
                    console.log("Current Todos:");
                    console.log(todoManager.toStringLong());
                } else {
                    console.log("No todos available.");
                }
                break;
            case "quit":
                isRunning = false;
                break;
            case "help":
                console.log(helpText);
                break;
            default:
                console.log("Unknown action. Please try again.");
        }
    }
}

if (require.main === module) {
    main();
}
