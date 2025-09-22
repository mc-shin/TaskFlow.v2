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

### Meeting Management Enhancements (September 12, 2025)
- **Optional End Time**: Meeting edit forms now treat end time as optional, with proper validation and null handling throughout the system. UI clearly indicates end time as "(선택사항)" (optional).
- **File Attachments & Downloads**: Implemented complete attachment system for meetings with file upload, display, and download capabilities. Download functionality uses direct fetch calls to object storage streaming endpoints with proper error handling and user feedback.
- **Form Validation**: Enhanced meeting creation and edit forms with better validation, proper drag-and-drop file uploads, and improved user experience.