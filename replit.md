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
- **Horizontal Project/Goal Layout**: Completely restructured the Kanban page to match provided design specification. Projects and goals now display as full-width horizontal rows spanning the entire page width, with tasks organized in separate status columns below.
- **Status Header Grid**: Implemented 4-column status headers at the top (진행전, 진행중, 완료, 지연) displaying task counts for each status, providing clear overview of work distribution.
- **Flat Task Organization**: Redesigned data structure to collect all tasks regardless of hierarchy and organize them purely by status in dedicated columns, with project/goal context preserved through metadata.
- **Enhanced Task Context**: Task cards now display project codes and goal titles for clear identification of their origin while maintaining the new flat column structure.
- **Expandable Project Navigation**: Maintained expand/collapse functionality for projects to show/hide their associated goals in the horizontal layout, enabling efficient navigation of project hierarchies.
- **Responsive Layout Design**: Ensured full-width project and goal rows adapt properly to container width while task columns maintain consistent spacing and organization.
- **Type Safety & Performance**: Resolved TypeScript compatibility issues with null/undefined handling and maintained efficient data processing with proper memoization for the new structure.

### Meeting Management Enhancements (September 12, 2025)
- **Optional End Time**: Meeting edit forms now treat end time as optional, with proper validation and null handling throughout the system. UI clearly indicates end time as "(선택사항)" (optional).
- **File Attachments & Downloads**: Implemented complete attachment system for meetings with file upload, display, and download capabilities. Download functionality uses direct fetch calls to object storage streaming endpoints with proper error handling and user feedback.
- **Form Validation**: Enhanced meeting creation and edit forms with better validation, proper drag-and-drop file uploads, and improved user experience.