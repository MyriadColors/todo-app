var readlineSync = require("readline-sync")
import { Database } from "bun:sqlite";


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
    constructor(todos: ReadonlyArray<Todo> = [], nextId: number = 1) {
        this.todos = TodoManager.consolidateIds(todos);
        this.nextId = nextId;
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

class DatabaseManager {

    private database: Database = new Database("todos.db");

    /**
 * The function `toSqlite` in TypeScript converts current todos to SQLite format and handles database
 * transactions.
 * @returns The `toSqlite()` method returns a `Result` object containing either a `Database` object on
 * success or an error message string on failure. The success case includes a boolean flag `success`
 * set to `true` and the database object as `value`. In case of an error, the `success` flag is set to
 * `false` and the error message is included in the `error
 */
    toSqlite(todoManager: TodoManager): Result<Database, string> {
        try {
            // Start transaction for atomic operation
            this.database.run("BEGIN");

            // Create table if it doesn't exist
            this.database.run("CREATE TABLE IF NOT EXISTS todos (id INTEGER PRIMARY KEY, title TEXT, description TEXT, completed BOOLEAN)");

            // Insert all current todos
            todoManager.getTodos().forEach(todo => {
                const description = todo.description || "";
                this.database.run(
                    "INSERT OR REPLACE INTO todos (id, title, description, completed) VALUES (?, ?, ?, ?)",
                    [todo.id, todo.title, description, todo.completed]
                );
            });

            // Commit transaction
            this.database.run("COMMIT");

            return { success: true, value: this.database };
        } catch (error) {
            // Rollback on error
            this.database.run("ROLLBACK");
            return { success: false, error: `Database save failed: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    /**
     * The function `fromSqlite` retrieves todos from an SQLite database, handling transactions and error
     * cases.
     * @returns The `fromSqlite()` function returns a `Result` object containing either a `TodoManager`
     * instance if the operation is successful, or a string error message if an error occurs during the
     * database load process.
     */
    fromSqlite(): Result<TodoManager, string> {
        try {
            // Start transaction for consistency
            this.database.run("BEGIN");

            const todos: Todo[] = [];
            const query = this.database.query("SELECT * FROM todos");
            const result = query.all();

            result.forEach((row: any) => {
                todos.push({
                    id: row.id,
                    title: row.title,
                    description: row.description || undefined,
                    completed: !!row.completed,
                });
            });

            // Commit transaction
            this.database.run("COMMIT");

            return { success: true, value: new TodoManager(todos) };
        } catch (error) {
            // Rollback on error
            this.database.run("ROLLBACK");
            return { success: false, error: `Database load failed: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    /**
     * Closes the database connection to free resources
     */
    closeDatabase(): Result<void, string> {
        try {
            this.database.close();
            return { success: true, value: undefined };
        } catch (error) {
            return { success: false, error: `Failed to close database: ${error instanceof Error ? error.message : String(error)}` };
        }
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

interface CommandSchema {
    command: string;
    aliases: string[];
}

const allowedCommands: CommandSchema[] = [
    { command: "add", aliases: ["create", "+"] },
    { command: "view", aliases: ["list", "ls"] },
    { command: "update", aliases: ["edit", "modify"] },
    { command: "complete", aliases: ["done", "finish"] },
    { command: "remove", aliases: ["delete", "rm"] },
    { command: "help", aliases: ["?", "h"] },
    { command: "quit", aliases: ["exit", "e", "q"] },
    { command: "save", aliases: ["persist", "store"] },
    { command: "load", aliases: ["import", "get"] }
];

const helpText = `
Available commands:
- add: Add a new todo
- view: View all todos
- update: Update an existing todo
- complete: Mark a todo as complete
- remove: Remove a todo
- save: Save todos to the database
- load: Load todos from the database
- help: Show this help message
- quit: Exit the application
`;

function confirmAction(message: string): boolean {
    return readlineSync.question(`${message} (y/n): `).toLowerCase() === 'y';
}

// a 'meta-handler' function to consolidate command handling operations
function commandHandler(command: string, todoManager: TodoManager, dbManager: DatabaseManager): { todoManager: TodoManager; dbManager: DatabaseManager; continueRunning: boolean } {
    switch (command) {
        case "add":
            const addResult = handleTodoCreation(todoManager);
            if (addResult.success) {
                todoManager = addResult.value;
            }
            break;
        case "view":
            console.log("Current Todos:");
            console.log(todoManager.toStringLong());
            break;
        case "update":
            const updateResult = handleTodoUpdate(todoManager);
            if (updateResult.success) {
                todoManager = updateResult.value;
            }
            break;
        case "complete":
            const completeResult = handleCompleteTodo(todoManager);
            if (completeResult.success) {
                todoManager = completeResult.value;
            }
            break;
        case "remove":
            if (confirmAction("Are you sure you want to remove a todo?")) {
                const removeResult = handleTodoRemove(todoManager);
                if (removeResult.success) {
                    todoManager = removeResult.value;
                    console.log("\nTodo removed successfully.");
                }
            }
            break;
        case "save":
            if (confirmAction("This will overwrite the existing database. Continue?")) {
                const saveResult = dbManager.toSqlite(todoManager);
                if (saveResult.success) {
                    console.log("\nTodos saved successfully.");
                }
            }
            break;
        case "load":
            if (confirmAction("This will overwrite the current todos. Continue?")) {
                const loadResult = dbManager.fromSqlite();
                if (loadResult.success) {
                    todoManager = loadResult.value;
                    console.log("\nTodos loaded successfully.");
                }
            }
            break;
        case "help":
            console.log(helpText);
            break;
        case "quit":
            return { todoManager, dbManager, continueRunning: false };
        default:
            console.log("Unknown command.");
    }
    return { todoManager, dbManager, continueRunning: true };
}

function main() {
    let todoManager = new TodoManager();
    let dbManager = new DatabaseManager();
    let isRunning = true;

    console.log("Welcome to the Todo App!");
    console.log(helpText);

    while (isRunning) {
        const action = readlineSync.question("Enter action: ");
        if (!allowedCommands.some(cmd => cmd.command === action || cmd.aliases.includes(action))) {
            console.log("Invalid command. Type 'help' to see available commands.");
            continue;
        }
        const result = commandHandler(action, todoManager, dbManager);
        if (result) {
            todoManager = result.todoManager;
            dbManager = result.dbManager;
            isRunning = result.continueRunning;
        }
    }
}

if (require.main === module) {
    main();
}
