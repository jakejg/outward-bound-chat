import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';

// Load environment variables
dotenv.config();

export async function pineconeInit() {
  try {
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || ''
    });

    const indexName = process.env.PINECONE_INDEX || 'openai-embeddings-index';

    // Check if index exists
    const indexesList = await pc.listIndexes();
    const indexExists = indexesList.indexes?.some(index => index.name === indexName);

    if (!indexExists) {
      console.log(`Creating index: ${indexName}`);
      await pc.createIndex({
        name: indexName,
        dimension: 1536, // Typical dimension for OpenAI embeddings
        metric: 'cosine',
        spec: { serverless: { cloud: 'aws', region: 'us-west-2' }}
      });
      console.log(`Index ${indexName} created successfully`);
    } else {
      console.log(`Index ${indexName} already exists`);
    }

    return pc.Index(indexName);
  } catch (error) {
    console.error('Error initializing Pinecone:', error);
    throw error;
  }
}

// Removed auto-execution to prevent unhandled promise rejection