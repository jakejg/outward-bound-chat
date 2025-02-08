# Outward Bound Course Preparation Chat Agent

An AI-powered chat agent that helps people prepare for their Outward Bound Course using RAG (Retrieval Augmented Generation) architecture.

## Features

- Document-based question answering using RAG architecture
- Integration with Pinecone vector database for efficient document retrieval
- Support for PDF and text document processing
- Real-time chat interface

## Prerequisites

- Node.js (v16 or higher)
- OpenAI API key
- Pinecone API key and environment

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your API keys:
   ```bash
   cp .env.example .env
   ```
4. Add your PDF and text documents to the project
5. Update the document paths in `src/index.ts`

## Running the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## API Endpoints

### POST /chat
Send questions to the chat agent:
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What should I pack for my course?"}'
```

