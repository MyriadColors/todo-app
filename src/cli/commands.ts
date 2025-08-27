import { Database } from "bun:sqlite";
import type { Result, Todo } from "../models/Types";
import { TodoManager } from "../models/TodoManager";
import { DatabaseManager } from "../services/DatabaseManager";
import * as readlineSync from "readline-sync";

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

export const commandMap = new Map<string, string>();
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
export const commandRegistry: Record<string, CommandConfig> = {
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
        handler: null, // Will be handled in app.ts
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

export function handleHelp(manager: TodoManager, lastInput: string): Result<TodoManager, string> {
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