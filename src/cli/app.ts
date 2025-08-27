import type { Result } from "../models/Types";
import { TodoManager } from "../models/TodoManager";
import { DatabaseManager } from "../services/DatabaseManager";
import { commandRegistry, handleHelp, commandMap } from "./commands";
import * as readlineSync from "readline-sync";

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
    config: typeof commandRegistry[string],
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
            result = (config.handler as any)(dbManager, todoManager);
        } else if (command === "help") {
            // Special handling for help command
            result = handleHelp(todoManager, lastInput);
        } else {
            // Regular commands take only todoManager
            result = (config.handler as any)(todoManager);
        }

        if (result.success) {
            // Update state if the command modifies it
            if (config.modifiesState && result.value instanceof TodoManager) {
                todoManager = result.value;
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

function confirmAction(message: string): boolean {
    return readlineSync.question(`${message} (y/n): `).toLowerCase() === 'y';
}

// Global variable to store the last input for help command parsing
let lastInput = "";

/**
 * Main application loop that handles user input and command execution
 * @param todoManager - The todo manager instance
 * @param dbManager - The database manager instance
 */
export function RunApp(todoManager: TodoManager, dbManager: DatabaseManager): void {
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


export function main() {
    let todoManager = new TodoManager();
    let dbManager = new DatabaseManager();
    console.log("\nAvailable commands: add, view, update, complete, remove, save, load, help, quit");

    RunApp(todoManager, dbManager);
}