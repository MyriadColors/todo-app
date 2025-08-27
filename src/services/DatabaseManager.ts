import { Database } from "bun:sqlite";
import type { Result, Todo } from "../models/Types";
import { TodoManager } from "../models/TodoManager";

export class DatabaseManager {

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