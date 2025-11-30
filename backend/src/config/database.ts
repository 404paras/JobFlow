import mongoose from 'mongoose';
import { config } from './index';
import { logger } from '../shared/utils/logger';

let isConnected = false;

export async function connectDatabase(): Promise<typeof mongoose> {
  if (isConnected) {
    logger.info('Using existing database connection');
    return mongoose;
  }

  try {
    const connection = await mongoose.connect(config.mongodb.uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    logger.info('MongoDB connected successfully', {
      host: connection.connection.host,
      name: connection.connection.name,
    });

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      isConnected = true;
    });

    return connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected gracefully');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

export function isDatabaseConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

