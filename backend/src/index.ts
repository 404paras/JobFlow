import { createApp } from './app';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './config/database';
import { schedulerService } from './modules/scheduler/scheduler.service';
import { logger } from './shared/utils/logger';

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  try {
    schedulerService.stop();
    logger.info('Scheduler stopped');

    await disconnectDatabase();
    logger.info('Database disconnected');

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    logger.info('Database connected');

    const app = createApp();

    const server = app.listen(config.port, () => {
      logger.info(`Server is running`, {
        port: config.port,
        environment: config.env,
        mongoUri: config.mongodb.uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
      });
    });

    await schedulerService.start();
    logger.info('Scheduler started');

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${config.port} is already in use`);
        process.exit(1);
      }
      throw error;
    });

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
      });
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

startServer();
