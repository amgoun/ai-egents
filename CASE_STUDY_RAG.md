# FlowBrain: RAG Implementation Case Study

## Overview

FlowBrain implements a sophisticated Retrieval Augmented Generation (RAG) system that enables AI agents to answer questions using context from user-uploaded documents. The system processes PDFs and text files, generates vector embeddings, and performs semantic search to retrieve relevant information for AI responses.

## Challenge

Traditional AI chatbots lack domain-specific knowledge and can only answer based on their training data. Users need agents that can reference specific documents, technical manuals, or proprietary content. The challenge was building a system that could efficiently process documents, store embeddings, and retrieve relevant context in real-time during conversations.

## Solution

The RAG pipeline processes documents through multiple stages: extraction, chunking, embedding generation, and vector storage. When users upload PDFs or text files, the system extracts content, splits it into semantically meaningful chunks (1000 characters with 200-character overlap), and generates 1536-dimensional embeddings using OpenAI's text-embedding-3-small model. These embeddings are stored in PostgreSQL using the pgvector extension. During chat interactions, user queries are converted to embeddings and matched against stored document chunks using cosine similarity search, retrieving the most relevant context to inject into the AI's system prompt.

## Technologies

- **Document Processing**: pdf-parse for PDF extraction, native text file reading
- **Text Splitting**: LangChain's RecursiveCharacterTextSplitter for intelligent chunking
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensions) via LangChain
- **Vector Database**: PostgreSQL with pgvector extension for similarity search
- **Search Algorithm**: Cosine similarity with configurable threshold (default 0.5) and result limits

## Key Features

- **Intelligent Chunking**: RecursiveCharacterTextSplitter preserves semantic boundaries, ensuring chunks maintain context
- **Efficient Embedding Storage**: Single embedding per document with chunk arrays stored in metadata, optimizing storage while maintaining searchability
- **Custom PostgreSQL Functions**: `match_agent_content` function performs vector similarity search with agent-specific filtering
- **Context Combination**: Retrieved chunks are intelligently combined with separators to provide coherent context to the AI
- **Token Cost Tracking**: Document processing costs are tracked (approximately 250 tokens per chunk) and deducted from user token limits
- **Error Handling**: Graceful handling of unsupported file types, empty documents, and API quota limits
- **Asynchronous Processing**: Document uploads are processed asynchronously, keeping the UI responsive

## Results/Impact

The RAG implementation enables agents to provide accurate, context-aware responses based on uploaded documents. Users can create specialized agents for technical documentation, educational materials, or proprietary knowledge bases. The system successfully processes documents ranging from small text files to large PDFs (50+ pages), with embedding generation completing in seconds. Vector search queries execute in milliseconds, allowing for real-time context retrieval during conversations. The semantic search approach outperforms keyword-based search, finding relevant information even when users phrase questions differently than the source material. This makes FlowBrain suitable for use cases like technical support bots, educational assistants, and domain-specific knowledge bases.

