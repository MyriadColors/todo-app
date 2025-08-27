# Todo Backend Application

A professional, immutable todo management application built with TypeScript and Bun. This project demonstrates clean architecture, separation of concerns, and best practices for backend development.

## 🎯 Project Overview

This todo application provides a command-line interface for managing todo items with persistent storage using SQLite. The project is structured to be maintainable, testable, and ready for future enhancements including REST API, testing frameworks, and deployment.

### Key Features

- **Immutable Data Management**: All todo operations return new instances, ensuring data integrity
- **Persistent Storage**: SQLite database with transaction support and rollback capabilities
- **Rich CLI Interface**: Comprehensive command set with aliases and help system
- **Error Handling**: Robust error classification and retry mechanisms
- **Clean Architecture**: Separation of models, services, and CLI components

## 📁 Project Structure

```md
todo-app/
├── index.ts                    # Main application entry point
├── package.json                # Project dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── README.md                   # This documentation file
├── src/
│   ├── models/
│   │   ├── Types.ts            # TypeScript interfaces and utility types
│   │   └── TodoManager.ts      # Immutable todo business logic
│   ├── services/
│   │   └── DatabaseManager.ts  # SQLite database operations
│   └── cli/
│       ├── commands.ts         # Command handlers and registry
│       └── app.ts              # CLI application logic and main loop
└── tests/                      # Test directory (ready for Phase 2)
```

## 🚀 Installation & Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Bun](https://bun.sh/) (recommended) or npm

### Quick Start

1. **Clone or download the project**

   ```bash
   # If you have the project files
   cd todo-app
   ```

2. **Install dependencies**

   ```bash
   # Using Bun (recommended)
   bun install

   # Or using npm
   npm install
   ```

3. **Run the application**

   ```bash
   # Using Bun (recommended)
   bun run index.ts

   # Or using node
   node index.ts
   ```

## 💡 Usage Guide

### Getting Started

When you first run the application, you'll see a welcome message with available commands:

```md
Available commands: add, view, update, complete, remove, save, load, help, quit
Enter action:
```

### Core Commands

#### 📝 Todo Management

| Command    | Aliases      | Description                    | Example    |
| ---------- | ------------ | ------------------------------ | ---------- |
| `add`      | create, +    | Add a new todo item            | `add`      |
| `view`     | list, ls     | Display all todos with details | `view`     |
| `update`   | edit, modify | Update an existing todo        | `update`   |
| `complete` | done, finish | Mark a todo as completed       | `complete` |
| `remove`   | delete, rm   | Remove a todo item             | `remove`   |

#### 💾 Database Operations

| Command | Aliases        | Description              | Example |
| ------- | -------------- | ------------------------ | ------- |
| `save`  | persist, store | Save todos to database   | `save`  |
| `load`  | import, get    | Load todos from database | `load`  |

#### 🔧 Utilities

| Command | Aliases    | Description           | Example              |
| ------- | ---------- | --------------------- | -------------------- |
| `help`  | ?, h       | Show help information | `help` or `help add` |
| `quit`  | exit, e, q | Exit the application  | `quit`               |

### Command Examples

#### Adding a Todo

```bash
Enter action: add
Enter todo title: Complete project documentation
Enter todo description: Write comprehensive README and API docs
```

#### Viewing Todos

```bash
Enter action: view
Current Todos:
ID: 1
Title: Complete project documentation
Description: Write comprehensive README and API docs
Completed: No
```

#### Updating a Todo

```bash
Enter action: update
Enter todo ID to update: 1
Enter new todo title (leave blank to keep current): Finish README
Enter new todo description (leave blank to keep current): Comprehensive documentation for the todo app
```

#### Marking as Complete

```bash
Enter action: complete
Enter todo ID to complete: 1
```

#### Removing a Todo

```bash
Enter action: remove
Are you sure you want to remove a todo? (y/n): y
Todo removed successfully.
```

#### Database Operations

```bash
# Save current todos to database
Enter action: save
This will overwrite the existing database. Continue? (y/n): y
Todos saved successfully.

# Load todos from database
Enter action: load
This will overwrite the current todos. Continue? (y/n): y
Todos loaded successfully.
```

## 🏗️ Architecture

### Layered Architecture

The application follows a clean, layered architecture:

```md
┌─────────────────┐
│   CLI Layer     │  ← User interface and command handling
├─────────────────┤
│  Service Layer  │  ← Database operations and persistence
├─────────────────┤
│   Model Layer   │  ← Business logic and data structures
└─────────────────┘
```

### Key Components

#### Models (`src/models/`)

- **Types.ts**: TypeScript interfaces and utility types
- **TodoManager.ts**: Immutable todo business logic with all CRUD operations

#### Services (`src/services/`)

- **DatabaseManager.ts**: SQLite database operations with transaction support

#### CLI (`src/cli/`)

- **commands.ts**: Command handlers, registry, and help system
- **app.ts**: Main application loop and CLI orchestration

### Design Principles

1. **Immutability**: All operations return new instances, preventing side effects
2. **Separation of Concerns**: Clear boundaries between UI, business logic, and data access
3. **Error Handling**: Comprehensive error classification and user-friendly messages
4. **Transaction Safety**: Database operations use transactions with rollback support

## 📝 Command Reference

### Complete Command List

| Category            | Command    | Aliases        | Usage            | Confirmation Required |
| ------------------- | ---------- | -------------- | ---------------- | --------------------- |
| **Todo Management** | `add`      | create, +      | `add`            | No                    |
|                     | `view`     | list, ls       | `view`           | No                    |
|                     | `update`   | edit, modify   | `update`         | No                    |
|                     | `complete` | done, finish   | `complete`       | No                    |
|                     | `remove`   | delete, rm     | `remove`         | Yes                   |
| **Database**        | `save`     | persist, store | `save`           | Yes                   |
|                     | `load`     | import, get    | `load`           | Yes                   |
| **Utilities**       | `help`     | ?, h           | `help [command]` | No                    |
|                     | `quit`     | exit, e, q     | `quit`           | No                    |

### Help System

The application includes a comprehensive help system:

- **General Help**: `help` - Shows all available commands grouped by category
- **Specific Help**: `help <command>` - Shows detailed information about a specific command

Example:

```bash
Enter action: help add
Command: add (aliases: create, +)
Description: Add a new todo item
Usage: add
```

## 🗄️ Database

The application uses SQLite for persistent storage with the following features:

- **Automatic Table Creation**: Creates `todos` table on first run
- **Transaction Support**: All database operations are wrapped in transactions
- **Rollback on Error**: Automatic rollback if any operation fails
- **Data Integrity**: Maintains consistent state even in case of failures

### Database Schema

```sql
CREATE TABLE todos (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE
);
```

## 🚨 Error Handling

The application implements sophisticated error handling:

### Error Classification

1. **User Errors**: Invalid input, unknown commands, missing todos

   - Displayed once without retry logic
   - Examples: "Unknown command", "Todo not found", "Title cannot be empty"

2. **System Errors**: Database failures, file system issues
   - Up to 3 retry attempts with exponential backoff
   - Examples: "Database save failed", "Failed to close database"

### Error Recovery

- **Automatic Retries**: System errors trigger retry logic
- **Graceful Degradation**: Application continues working even if database operations fail
- **Clear Messaging**: Users receive actionable error messages

## 🔄 Future Enhancements

This project is designed to be easily extended with additional features:

### Phase 2: Testing

- Unit tests for TodoManager methods
- Integration tests for DatabaseManager
- Edge case testing and error scenarios

### Phase 3: REST API

- HTTP server with Bun/Express/Fastify
- RESTful endpoints for all todo operations
- JSON response format with success/error indicators

### Phase 4: Async/Await & Improvements

- Async database operations
- Migration system
- Enhanced logging with pino/winston
- Environment configuration

### Phase 5: Deployment & Polish

- Docker containerization
- CI/CD pipeline with GitHub Actions
- Enhanced documentation and examples

### Stretch Goals

- JWT-based authentication
- Multi-user support
- GraphQL API
- WebSocket real-time updates

## 🤝 Contributing

This project is designed as a learning resource and portfolio piece. Feel free to:

1. Study the architecture and patterns
2. Extend with additional features
3. Add tests and documentation
4. Experiment with different technologies

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Built with [Bun](https://bun.sh/) - The all-in-one JavaScript runtime
- Powered by [SQLite](https://www.sqlite.org/) - Self-contained, serverless database
- TypeScript for type safety and developer experience

---
