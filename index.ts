var readlineSync = require("readline-sync")
import { Database } from "bun:sqlite";
import type { Result, Todo } from "./src/Types";

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
        if (this.todos.length === 0) {
            return "No todos found.";
        }

        return this.todos
            .map((todo) => {
                const description = todo.description || "N/A";
                const completedStatus = todo.completed ? "Yes" : "No";
                return `ID: ${todo.id}
Title: ${todo.title}
Description: ${description}
Completed: ${completedStatus}`;
            })
            .join("\n\n");
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
            try {
                this.database.run("ROLLBACK");
            } catch (rollbackError) {
                return { success: false, error: `Rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}` };
            }
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

function promptForTodoId(manager: TodoManager, action: string): number | null {
    if (manager.getTodos().length === 0) {
        console.log("No todos available.");
        return null;
    }
    console.log(manager.toString());
    const id = parseInt(readlineSync.question(`Enter todo ID to ${action}: `));
    return isNaN(id) ? null : id;
}

function handleTodoCreation(manager: TodoManager): Result<TodoManager, string> {
    const title = readlineSync.question("Enter todo title: ");
    if (!title.trim()) {
        return { success: false, error: "Title cannot be empty" };
    }
    const description = readlineSync.question("Enter todo description (optional): ");

    const updatedManager = manager.addTodo(title, description || undefined);
    return { success: true, value: updatedManager };
}

function handleTodoUpdate(manager: TodoManager): Result<TodoManager, string> {
    const id = promptForTodoId(manager, "update");
    if (id === null) {
        return { success: false, error: "No valid ID provided" };
    }

    const title = readlineSync.question("Enter new todo title (leave blank to keep current): ");
    const description = readlineSync.question("Enter new todo description (leave blank to keep current): ");

    if (!title.trim() && !description.trim()) {
        return { success: false, error: "No changes made" };
    }

    const result = manager.updateTodo(id, {
        title: title.trim() || undefined,
        description: description.trim() || undefined
    });

    return result;
}

function handleTodoRemove(manager: TodoManager): Result<TodoManager, string> {
    const id = promptForTodoId(manager, "remove");
    if (id === null) {
        return { success: false, error: "No valid ID provided" };
    }

    const result = manager.removeTodo(id);
    return result;
}

function handleCompleteTodo(manager: TodoManager): Result<TodoManager, string> {
    const id = promptForTodoId(manager, "complete");
    if (id === null) {
        return { success: false, error: "No valid ID provided" };
    }

    const result = manager.markCompleted(id);
    return result;
}

function handleExit(dbManager: DatabaseManager): Result<void, string> {
    const closeResult = dbManager.closeDatabase();
    if (!closeResult.success) {
        console.error("Warning: Failed to close database:", closeResult.error);
    }

    return { success: true, value: undefined };
}

function handleView(manager: TodoManager): Result<TodoManager, string> {
    console.log("Current Todos:");
    console.log(manager.toStringLong());
    return { success: true, value: manager };
}

function handleHelp(manager: TodoManager): Result<TodoManager, string> {
    // Parse the input to check for specific command help
    const parts = lastInput.trim().split(/\s+/);
    if (parts.length > 1) {
        // Specific command help: "help <command>"
        const specificCommand = commandMap.get(parts[1]);
        if (specificCommand) {
            console.log(generateSpecificHelp(specificCommand));
        } else {
            console.log(`Unknown command: ${parts[1]}. Type 'help' to see all available commands.`);
        }
    } else {
        // General help
        console.log(generateGeneralHelp());
    }
    return { success: true, value: manager };
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

const commandMap = new Map<string, string>();
allowedCommands.forEach(cmd => {
    commandMap.set(cmd.command, cmd.command);
    cmd.aliases.forEach(alias => commandMap.set(alias, cmd.command));
});

// Dynamic help generation functions
function generateGeneralHelp(): string {
    let helpText = `\nAvailable commands:\n`;

    // Group commands by category for better organization
    const managementCommands = ['add', 'view', 'update', 'complete', 'remove'];
    const databaseCommands = ['save', 'load'];
    const utilityCommands = ['help', 'quit'];

    // Add management commands
    helpText += `\n📝 Todo Management:\n`;
    managementCommands.forEach(cmd => {
        const config = commandRegistry[cmd];
        const aliases = allowedCommands.find(c => c.command === cmd)?.aliases || [];
        const aliasText = aliases.length > 0 ? ` (${aliases.join(', ')})` : '';
        helpText += `  ${cmd}${aliasText.padEnd(12)} - ${config.description}\n`;
    });

    // Add database commands
    helpText += `\n💾 Database Operations:\n`;
    databaseCommands.forEach(cmd => {
        const config = commandRegistry[cmd];
        const aliases = allowedCommands.find(c => c.command === cmd)?.aliases || [];
        const aliasText = aliases.length > 0 ? ` (${aliases.join(', ')})` : '';
        helpText += `  ${cmd}${aliasText.padEnd(12)} - ${config.description}\n`;
    });

    // Add utility commands
    helpText += `\n🔧 Utilities:\n`;
    utilityCommands.forEach(cmd => {
        const config = commandRegistry[cmd];
        const aliases = allowedCommands.find(c => c.command === cmd)?.aliases || [];
        const aliasText = aliases.length > 0 ? ` (${aliases.join(', ')})` : '';
        helpText += `  ${cmd}${aliasText.padEnd(12)} - ${config.description}\n`;
    });

    helpText += `\nType 'help <command>' for detailed information about a specific command.\n`;
    return helpText;
}

function generateSpecificHelp(command: string): string {
    const config = commandRegistry[command];
    if (!config) {
        return `Unknown command: ${command}. Type 'help' to see all available commands.`;
    }

    const aliases = allowedCommands.find(c => c.command === command)?.aliases || [];
    const aliasText = aliases.length > 0 ? ` (aliases: ${aliases.join(', ')})` : '';

    let helpText = `\nCommand: ${command}${aliasText}\n`;
    helpText += `Description: ${config.description}\n`;
    helpText += `Usage: ${config.usage}\n`;

    if (config.requiresConfirmation) {
        helpText += `Note: This command requires confirmation before execution.\n`;
    }

    return helpText;
}

function confirmAction(message: string): boolean {
    return readlineSync.question(`${message} (y/n): `).toLowerCase() === 'y';
}

// Define command handler types
type CommandHandler<T> = (manager: T) => Result<T, string>;
type DatabaseCommandHandler = (dbManager: DatabaseManager, todoManager: TodoManager) => Result<TodoManager | Database, string>;
type ExitCommandHandler = (dbManager: DatabaseManager) => Result<void, string>;

// Command configuration interface
interface CommandConfig {
    handler: CommandHandler<TodoManager> | DatabaseCommandHandler | ExitCommandHandler | null;
    requiresConfirmation: boolean;
    confirmationMessage?: string;
    modifiesState: boolean;
    successMessage?: string;
    isQuitCommand?: boolean;
    isDatabaseCommand?: boolean;
    description: string;
    usage?: string;
}

// Command registry
const commandRegistry: Record<string, CommandConfig> = {
    add: {
        handler: handleTodoCreation,
        requiresConfirmation: false,
        modifiesState: true,
        description: "Add a new todo item",
        usage: "add",
    },
    view: {
        handler: handleView,
        requiresConfirmation: false,
        modifiesState: false,
        description: "Display all todos with details",
        usage: "view",
    },
    update: {
        handler: handleTodoUpdate,
        requiresConfirmation: false,
        modifiesState: true,
        description: "Update an existing todo's title and/or description",
        usage: "update",
    },
    complete: {
        handler: handleCompleteTodo,
        requiresConfirmation: false,
        modifiesState: true,
        description: "Mark a todo as completed",
        usage: "complete",
    },
    remove: {
        handler: handleTodoRemove,
        requiresConfirmation: true,
        confirmationMessage: "Are you sure you want to remove a todo?",
        modifiesState: true,
        successMessage: "\nTodo removed successfully.",
        description: "Remove a todo item (requires confirmation)",
        usage: "remove",
    },
    save: {
        handler: (dbManager: DatabaseManager, todoManager: TodoManager) => dbManager.toSqlite(todoManager),
        requiresConfirmation: true,
        confirmationMessage: "This will overwrite the existing database. Continue?",
        modifiesState: false,
        successMessage: "\nTodos saved successfully.",
        isDatabaseCommand: true,
        description: "Save current todos to database (requires confirmation)",
        usage: "save",
    },
    load: {
        handler: (dbManager: DatabaseManager, todoManager: TodoManager) => dbManager.fromSqlite(),
        requiresConfirmation: true,
        confirmationMessage: "This will overwrite the current todos. Continue?",
        modifiesState: true,
        successMessage: "\nTodos loaded successfully.",
        isDatabaseCommand: true,
        description: "Load todos from database (requires confirmation)",
        usage: "load",
    },
    help: {
        handler: handleHelp,
        requiresConfirmation: false,
        modifiesState: false,
        description: "Show help information",
        usage: "help [command]",
    },
    quit: {
        handler: (dbManager: DatabaseManager) => handleExit(dbManager),
        requiresConfirmation: false,
        modifiesState: false,
        isQuitCommand: true,
        description: "Exit the application",
        usage: "quit",
    },
};

// Global variable to store the last input for help command parsing
let lastInput = "";

// Error classification for retry logic
enum ErrorType {
    USER_ERROR,
    SYSTEM_ERROR
}

function classifyError(error: string): ErrorType {
    // User errors - these should not count toward retries
    const userErrorPatterns = [
        "Unknown command",
        "Invalid command",
        "Please enter a valid command",
        "No valid ID provided",
        "Todo not found",
        "Todo already completed",
        "Title cannot be empty",
        "No changes made",
        "No todos available"
    ];

    // Check if the error message matches any user error pattern
    return userErrorPatterns.some(pattern => error.includes(pattern))
        ? ErrorType.USER_ERROR
        : ErrorType.SYSTEM_ERROR;
}

// Generic command executor that handles all the common logic
function executeCommand(
    command: string,
    config: CommandConfig,
    todoManager: TodoManager,
    dbManager: DatabaseManager
): Result<{ todoManager: TodoManager; dbManager: DatabaseManager; continueRunning: boolean }, string> {

    // Handle quit command specially due to different return type
    if (config.isQuitCommand) {
        return { success: true, value: { todoManager, dbManager, continueRunning: false } };
    }

    // Check confirmation if required
    if (config.requiresConfirmation && config.confirmationMessage) {
        if (!confirmAction(config.confirmationMessage)) {
            return { success: true, value: { todoManager, dbManager, continueRunning: true } };
        }
    }

    // Execute the handler if it exists
    if (config.handler) {
        let result: Result<any, string>;

        if (config.isDatabaseCommand) {
            // Database commands take both managers
            result = (config.handler as DatabaseCommandHandler)(dbManager, todoManager);
        } else {
            // Regular commands take only todoManager
            result = (config.handler as CommandHandler<TodoManager>)(todoManager);
        }

        if (result.success) {
            // Update state if the command modifies it
            if (config.modifiesState) {
                if (config.isDatabaseCommand && result.value instanceof TodoManager) {
                    todoManager = result.value;
                } else if (!config.isDatabaseCommand && result.value instanceof TodoManager) {
                    todoManager = result.value;
                }
            }

            // Log success message if provided
            if (config.successMessage) {
                console.log(config.successMessage);
            }

            return { success: true, value: { todoManager, dbManager, continueRunning: true } };
        } else {
            // Return error result to be handled by commandHandler
            return { success: false, error: (result as { success: false; error: string }).error };
        }
    }

    return { success: true, value: { todoManager, dbManager, continueRunning: true } };
}

// Simplified command handler that uses the generic executor
function commandHandler(command: string, todoManager: TodoManager, dbManager: DatabaseManager): Result<{ todoManager: TodoManager; dbManager: DatabaseManager; continueRunning: boolean }, string> {
    const config = commandRegistry[command];

    if (!config) {
        return { success: false, error: "Unknown command" };
    }

    return executeCommand(command, config, todoManager, dbManager);
}

/**
 * Main application loop that handles user input and command execution
 * @param todoManager - The todo manager instance
 * @param dbManager - The database manager instance
 */
function RunApp(todoManager: TodoManager, dbManager: DatabaseManager): void {
    const MAX_RETRIES = 3;
    let retryCount = 0;
    let isRunning = true;

    while (isRunning) {
        // Display prompt and get user input
        const action = readlineSync.question("Enter action: ").trim();

        // Store the input for help command parsing
        lastInput = action;

        // Skip empty input
        if (!action) {
            console.warn("Please enter a valid command.");
            continue;
        }

        // Validate and get command
        const command = commandMap.get(action);
        if (!command) {
            console.error(`Invalid command: "${action}". Type 'help' to see available commands.`);
            continue;
        }

        // Execute command and handle result
        const result = commandHandler(command, todoManager, dbManager);

        if (result.success) {
            const { todoManager: newTodoManager, dbManager: newDbManager, continueRunning } = result.value;
            todoManager = newTodoManager;
            dbManager = newDbManager;
            isRunning = continueRunning;
            retryCount = 0; // Reset retry counter on successful execution
        } else {
            // Handle command execution error
            const errorMessage = (result as { success: false; error: string }).error;
            const errorType = classifyError(errorMessage);

            if (errorType === ErrorType.USER_ERROR) {
                // For user errors, just display the error and continue without retry logic
                console.error(`Input error: ${errorMessage}`);
                console.log("Please correct your input and try again.");
                // Don't increment retry count for user errors
            } else {
                // For system errors, use retry logic
                console.error(`System error: ${errorMessage}`);
                retryCount++;

                if (retryCount > MAX_RETRIES) {
                    console.error(`Maximum retry attempts (${MAX_RETRIES}) exceeded. Exiting application.`);
                    isRunning = false;
                } else {
                    console.warn(`System error detected. Retry attempt ${retryCount}/${MAX_RETRIES}. Please try again.`);
                }
            }
        }
    }

    // Cleanup resources when loop exits
    console.log("\nShutting down application...");
    const closeResult = dbManager.closeDatabase();
    if (!closeResult.success) {
        console.error(`Warning: ${(closeResult as { success: false; error: string }).error}`);
    }
}

function main() {
    let todoManager = new TodoManager();
    let dbManager = new DatabaseManager();
    console.log("\nAvailable commands: add, view, update, complete, remove, save, load, help, quit");

    RunApp(todoManager, dbManager);
}

if (require.main === module) {
    main();
}
