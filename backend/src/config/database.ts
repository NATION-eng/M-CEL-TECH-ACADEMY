import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryServer: MongoMemoryServer | null = null;

export const connectDB = async (): Promise<void> => {
  let uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not defined in environment variables.');
  }

  if (process.env.USE_MEMORY_DB === 'true') {
    console.log('🌱 Starting in-memory MongoDB server...');
    mongoMemoryServer = await MongoMemoryServer.create();
    uri = mongoMemoryServer.getUri();
    console.log(`🌱 In-memory MongoDB server started at: ${uri}`);
  }

  mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connected');
  });
  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected');
  });

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000, // fail fast instead of Mongoose's 30s default
    maxPoolSize: 50,                // maintain up to 50 socket connections
    minPoolSize: 5,                 // keep at least 5 connections ready
    socketTimeoutMS: 45000,          // close sockets after 45s of inactivity
  });
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
    console.log('🌱 In-memory MongoDB server stopped.');
  }
};
