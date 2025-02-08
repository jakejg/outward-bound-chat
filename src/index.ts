import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { Pinecone, Index, RecordMetadata } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { Document } from "@langchain/core/documents";
import {pineconeInit} from './pinecone.js';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debugging middleware
app.use((req, res, next) => {
  console.log('Request Headers:', req.headers);
  console.log('Request Body:', req.body);
  next();
});

// Ping endpoint for wake-up calls
app.get('/ping', (req, res) => {
    res.status(200).json({ status: 'Server is awake' });
});

// Initialize Pinecone client
async function initVectorStore() {
  const pineconeIndex = await pineconeInit();
  
  // Initialize embeddings
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  // Create vector store
  return await PineconeStore.fromExistingIndex(
    embeddings,
    { 
      pineconeIndex: pineconeIndex as any,
      namespace: process.env.PINECONE_NAMESPACE
    }
  );
}

async function loadDocuments() {
    // Load PDF and text documents
    const pdfLoader = new PDFLoader('./documents/CCTX-961-Gear-List.pdf');
    // const textLoader = new TextLoader('path/to/your/document.txt');
    
    const [pdfDocs] = await Promise.all([
        pdfLoader.load(),
        // textLoader.load(),
    ]);

    return [...pdfDocs];
}

let vectorStore: PineconeStore;
let qaChain: RunnableSequence;

// Initialize the application
async function initialize() {
    try {
        vectorStore = await initVectorStore();
        
        // Load and index documents
        const documents = await loadDocuments();
        await vectorStore.addDocuments(documents);
        
        // Create the model
        const model = new ChatOpenAI({
            modelName: 'gpt-4-turbo-preview',
            temperature: 0.7,
        });

        // Create the retriever
        const retriever = vectorStore.asRetriever();

        // Create the prompt template
        const prompt = ChatPromptTemplate.fromMessages([
            ["system", "You are a helpful assistant that answers questions based on the provided context."],
            ["human", "Context: {context}\n\nQuestion: {question}\n\nAnswer the question based on the context provided."],
        ]);

        // Create the chain using proper LCEL
        const chain = prompt.pipe(model).pipe(new StringOutputParser());

        // Create the final chain with retrieval
        qaChain = RunnableSequence.from([
            {
                question: (input: string) => input,
                context: async (input: string) => {
                    const relevantDocs = await retriever.getRelevantDocuments(input);
                    return relevantDocs.map(doc => doc.pageContent).join('\n');
                },
            },
            chain,
        ]);
        
        console.log('Initialization complete!');
    } catch (error) {
        console.error('Initialization failed:', error);
    }
}

// Chat endpoint
app.post('/chat', async (req, res) => {
    try {
        const question = req.body.question;
        if (!question) {
            return res.status(400).json({ error: 'Question is required' });
        }

        // Use the chain to get the answer
        const response = await qaChain.invoke(question);
        
        res.json({ answer: response });
    } catch (error) {
        console.error('Error processing chat:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    initialize();
});
