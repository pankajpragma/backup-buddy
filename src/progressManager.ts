import * as vscode from 'vscode';
import { Logger } from './logger';

const logger = Logger.getInstance();

export interface ProgressOptions {
  title: string;
  cancellable?: boolean;
  location?: vscode.ProgressLocation;
}

export interface ProgressStep {
  message: string;
  increment?: number;
}

export class ProgressManager {
  private static activeProgress: Map<string, { tokenSource: vscode.CancellationTokenSource; timestamp: number }> = new Map();
  private static cleanupInterval: NodeJS.Timeout | undefined;
  private static readonly STALE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  /**
   * Execute a task with progress indication
   */
  public static async withProgress<T>(
    options: ProgressOptions,
    task: (progress: vscode.Progress<ProgressStep>, token: vscode.CancellationToken) => Promise<T>
  ): Promise<T> {
    const progressId = this.generateProgressId();
    const cancellationTokenSource = new vscode.CancellationTokenSource();
    
    this.activeProgress.set(progressId, {
      tokenSource: cancellationTokenSource,
      timestamp: Date.now()
    });
    
    // Start cleanup interval if not already running
    this.startCleanupInterval();
    
    try {
      logger.info(`Starting progress task: ${options.title}`);
      
      const result = await vscode.window.withProgress(
        {
          location: options.location || vscode.ProgressLocation.Notification,
          title: options.title,
          cancellable: options.cancellable || false
        },
        async (progress, token) => {
          // Create combined cancellation token
          const combinedToken = this.createCombinedToken(token, cancellationTokenSource.token);
          
          return await task(progress, combinedToken);
        }
      );
      
      logger.info(`Progress task completed: ${options.title}`);
      return result;
    } catch (error) {
      logger.error(`Progress task failed: ${options.title}`, error);
      throw error;
    } finally {
      cancellationTokenSource.dispose();
      this.activeProgress.delete(progressId);
    }
  }

  /**
   * Execute cleanup with progress indication
   */
  public static async withCleanupProgress<T>(
    task: (progress: vscode.Progress<ProgressStep>, token: vscode.CancellationToken) => Promise<T>
  ): Promise<T> {
    return this.withProgress(
      {
        title: 'Cleaning up old backup files...',
        cancellable: true,
        location: vscode.ProgressLocation.Notification
      },
      task
    );
  }

  /**
   * Execute backup with progress indication
   */
  public static async withBackupProgress<T>(
    fileName: string,
    task: (progress: vscode.Progress<ProgressStep>, token: vscode.CancellationToken) => Promise<T>
  ): Promise<T> {
    return this.withProgress(
      {
        title: `Backing up ${fileName}...`,
        cancellable: false,
        location: vscode.ProgressLocation.Window
      },
      task
    );
  }

  /**
   * Execute bulk operation with progress indication
   */
  public static async withBulkProgress<T>(
    operationName: string,
    task: (progress: vscode.Progress<ProgressStep>, token: vscode.CancellationToken) => Promise<T>
  ): Promise<T> {
    return this.withProgress(
      {
        title: `${operationName}...`,
        cancellable: true,
        location: vscode.ProgressLocation.Notification
      },
      task
    );
  }

  /**
   * Cancel all active progress operations
   */
  public static cancelAll(): void {
    logger.info(`Cancelling ${this.activeProgress.size} active progress operations`);
    
    for (const [id, { tokenSource }] of this.activeProgress) {
      tokenSource.cancel();
      tokenSource.dispose();
    }
    
    this.activeProgress.clear();
    this.stopCleanupInterval();
  }
  
  private static startCleanupInterval(): void {
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.cleanupStaleOperations();
      }, 60000); // Check every minute
    }
  }
  
  private static stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }
  
  private static cleanupStaleOperations(): void {
    const now = Date.now();
    const staleIds: string[] = [];
    
    for (const [id, { tokenSource, timestamp }] of this.activeProgress) {
      if (now - timestamp > this.STALE_TIMEOUT) {
        logger.warn(`Cleaning up stale progress operation: ${id}`);
        tokenSource.cancel();
        tokenSource.dispose();
        staleIds.push(id);
      }
    }
    
    staleIds.forEach(id => this.activeProgress.delete(id));
    
    // Stop cleanup interval if no active operations
    if (this.activeProgress.size === 0) {
      this.stopCleanupInterval();
    }
  }

  /**
   * Get count of active progress operations
   */
  public static getActiveCount(): number {
    return this.activeProgress.size;
  }

  /**
   * Create a progress reporter helper
   */
  public static createReporter(
    progress: vscode.Progress<ProgressStep>,
    totalSteps: number
  ): ProgressReporter {
    return new ProgressReporter(progress, totalSteps);
  }

  private static generateProgressId(): string {
    return `progress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static createCombinedToken(
    token1: vscode.CancellationToken,
    token2: vscode.CancellationToken
  ): vscode.CancellationToken {
    const combinedTokenSource = new vscode.CancellationTokenSource();
    
    const dispose1 = token1.onCancellationRequested(() => {
      combinedTokenSource.cancel();
    });
    
    const dispose2 = token2.onCancellationRequested(() => {
      combinedTokenSource.cancel();
    });
    
    // Clean up listeners when token is cancelled
    combinedTokenSource.token.onCancellationRequested(() => {
      dispose1.dispose();
      dispose2.dispose();
    });
    
    return combinedTokenSource.token;
  }
}

export class ProgressReporter {
  private currentStep = 0;
  private stepIncrement: number;

  constructor(
    private progress: vscode.Progress<ProgressStep>,
    private totalSteps: number
  ) {
    this.stepIncrement = totalSteps > 0 ? 100 / totalSteps : 0;
  }

  /**
   * Report progress for next step
   */
  public nextStep(message: string): void {
    this.currentStep++;
    const percentage = Math.min(100, this.currentStep * this.stepIncrement);
    
    this.progress.report({
      message: `${message} (${this.currentStep}/${this.totalSteps})`,
      increment: this.stepIncrement
    });
    
    logger.debug(`Progress: ${percentage.toFixed(1)}% - ${message}`);
  }

  /**
   * Report custom progress
   */
  public report(message: string, increment?: number): void {
    this.progress.report({ message, increment });
    logger.debug(`Progress: ${message}`);
  }

  /**
   * Complete the progress
   */
  public complete(message: string = 'Completed'): void {
    const remaining = 100 - (this.currentStep * this.stepIncrement);
    if (remaining > 0) {
      this.progress.report({
        message,
        increment: remaining
      });
    }
    logger.debug(`Progress completed: ${message}`);
  }
}