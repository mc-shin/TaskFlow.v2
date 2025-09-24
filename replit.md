# Task Management Dashboard

## Overview

This is a full-stack task management application built with React, Express, and Drizzle ORM. The application provides a Korean-language dashboard for managing tasks with features like status tracking, user assignment, activity logging, calendar integration, and comprehensive meeting management. The system uses a modern tech stack with TypeScript throughout and includes comprehensive UI components powered by shadcn/ui.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management and caching
- **UI Framework**: shadcn/ui components built on Radix UI primitives with Tailwind CSS
- **Styling**: Tailwind CSS with CSS variables for theming, dark mode support
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL session store
- **API Design**: RESTful API with structured error handling and request logging

### Data Storage
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM with schema-first approach
- **Migrations**: Drizzle Kit for database schema management
- **Tables**: Users, tasks, and activities with proper foreign key relationships
- **Fallback**: In-memory storage implementation for development/testing

### Authentication & Authorization
- **Session-based**: Uses express-session with PostgreSQL store
- **User Management**: Basic user CRUD operations with username/password
- **Default Users**: Pre-populated with Korean test users (hyejin, hyejung, chamin)

### API Structure
- **Task Management**: Full CRUD operations for tasks with status filtering
- **User Management**: User creation and retrieval endpoints
- **Activity Logging**: Activity creation and retrieval for audit trails
- **Statistics**: Aggregated data endpoints for dashboard metrics

## External Dependencies

### Core Technologies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **drizzle-orm & drizzle-kit**: Type-safe ORM and schema management
- **express**: Web application framework
- **react & react-dom**: Frontend UI library
- **vite**: Build tool and development server

### UI & Styling
- **@radix-ui/***: Unstyled, accessible UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Utility for creating variant-based component APIs
- **lucide-react**: Icon library

### Data Management
- **@tanstack/react-query**: Server state management and caching
- **react-hook-form**: Form state management
- **@hookform/resolvers**: Form validation resolvers
- **zod**: Schema validation library
- **drizzle-zod**: Integration between Drizzle and Zod

### Development Tools
- **typescript**: Static type checking
- **@replit/vite-plugin-runtime-error-modal**: Development error handling
- **wouter**: Lightweight router for React
- **date-fns**: Date utility library

### Session & Storage
- **connect-pg-simple**: PostgreSQL session store for Express
- **express-session**: Session middleware

The application is designed as a monorepo with shared schemas between client and server, ensuring type safety across the entire stack. The development setup uses Vite for hot module replacement and includes Replit-specific tooling for cloud development.

## Recent Changes

### List Tree UI/UX Improvements (September 18, 2025)
- **Assignee Field Row Consistency**: Fixed layout shifts when editing assignee fields in the list view. The row now maintains consistent height and layout between edit and display modes, preventing visual jumps during inline editing.
- **Hierarchical Checkbox Selection**: Implemented intelligent checkbox selection behavior where:
  - Selecting a project automatically selects all its goals and tasks
  - Selecting a goal automatically selects all its tasks
  - Deselecting a parent item deselects all its children
  - When all children are individually selected, the parent automatically becomes selected
  - Provides intuitive bulk selection capabilities for project management workflows

### Kanban Layout Complete Restructuring (September 24, 2025)
- **Simplified Hierarchical Structure**: Restructured the Kanban page with a clean hierarchy: Global status headers → Projects → Goals → Task lists. Removed individual status columns from project and goal levels to create a simplified, non-redundant interface.
- **Global Status Headers**: Maintained 4-column status headers at the top (진행전, 진행중, 완료, 이슈) displaying comprehensive task counts for overall project status visibility.
- **Clean Project/Goal Expansion**: Projects and goals display as expandable rows with their associated tasks shown as simple card lists rather than status-segmented columns, eliminating visual clutter while preserving hierarchy.
- **Task Card Enhancement**: Individual task cards now display status badges, progress indicators, and project codes, providing all necessary information without requiring separate status groupings at the project/goal level.
- **Sidebar Color Integration**: Applied consistent sidebar theme colors throughout the Kanban interface for visual coherence with the rest of the application.
- **Data Consistency**: Ensured complete parity with the list page data structure while adapting the presentation for the simplified Kanban format.

### Meeting Management Enhancements (September 12, 2025)
- **Optional End Time**: Meeting edit forms now treat end time as optional, with proper validation and null handling throughout the system. UI clearly indicates end time as "(선택사항)" (optional).
- **File Attachments & Downloads**: Implemented complete attachment system for meetings with file upload, display, and download capabilities. Download functionality uses direct fetch calls to object storage streaming endpoints with proper error handling and user feedback.
- **Form Validation**: Enhanced meeting creation and edit forms with better validation, proper drag-and-drop file uploads, and improved user experience.