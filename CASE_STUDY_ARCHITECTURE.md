# FlowBrain: Technical Architecture Case Study

## Overview

FlowBrain is built on a modern, scalable architecture leveraging Next.js 15's App Router, Supabase's managed backend services, and advanced vector search capabilities. The system is designed for real-time performance, type safety, and seamless scalability from prototype to production.

## Challenge

Building a full-stack AI platform requires integrating multiple complex systems: real-time chat, vector search, authentication, file storage, payment processing, and usage tracking. The architecture needed to support real-time updates, handle large document processing workloads, maintain type safety across the stack, and provide a smooth developer experience.

## Solution

The architecture follows a serverless-first approach with clear separation of concerns. Next.js 15 handles routing, server actions, and API routes, while Supabase provides managed PostgreSQL with pgvector extension for vector operations, built-in authentication, and object storage. Drizzle ORM ensures type-safe database queries and migrations. The frontend uses React 19 with Zustand for state management, providing a responsive real-time experience with optimistic updates.

## Technologies

- **Framework**: Next.js 15 with App Router, React Server Components, and Server Actions
- **Database**: Supabase PostgreSQL with pgvector extension for 1536-dimensional embeddings
- **ORM**: Drizzle ORM with type-safe queries and automated migrations
- **State Management**: Zustand for client-side state, React hooks for server state
- **Real-Time**: Supabase Realtime subscriptions for live agent updates
- **Storage**: Supabase Storage buckets for agent avatars and document resources
- **Type Safety**: TypeScript throughout, with shared types between frontend and backend

## Key Features

- **Type-Safe Database Layer**: Drizzle ORM provides compile-time type checking for all database operations, reducing runtime errors
- **Vector Search Infrastructure**: Custom PostgreSQL functions for cosine similarity search with configurable thresholds and result limits
- **Real-Time Subscriptions**: Supabase Realtime enables instant updates when agents are created, updated, or deleted
- **Server Actions**: Next.js Server Actions handle form submissions and mutations with built-in error handling
- **Optimized Embeddings**: LangChain integration for efficient document chunking (1000 chars with 200 overlap) and batch embedding generation
- **Token Tracking System**: Comprehensive usage tracking with automatic period management and limit enforcement
- **Migration System**: Version-controlled database migrations using Drizzle Kit for safe schema evolution

## Results/Impact

The architecture successfully handles production workloads with sub-second response times for vector searches, real-time updates across multiple clients, and efficient token tracking. The type-safe approach significantly reduces bugs and improves developer productivity. The serverless architecture scales automatically, handling traffic spikes without manual intervention. The modular design allows for easy feature additions, such as new AI model providers or payment gateways, without major refactoring. The system processes documents asynchronously, ensuring the UI remains responsive even when handling large PDF uploads.

