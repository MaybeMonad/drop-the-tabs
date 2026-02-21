// packages/shared-core/src/sync/factory.ts

import type { AdapterConfig, SyncAdapter } from '../types/index.js';
import { BaseSyncAdapter } from './adapter.js';

/**
 * Factory for creating sync adapters
 */
export class SyncAdapterFactory {
  private static adapters: Map<string, new (config: AdapterConfig) => BaseSyncAdapter> = new Map();

  /**
   * Register an adapter type
   */
  static register(type: string, adapterClass: new (config: AdapterConfig) => BaseSyncAdapter): void {
    this.adapters.set(type, adapterClass);
  }

  /**
   * Create a sync adapter instance
   */
  static create(config: AdapterConfig): BaseSyncAdapter {
    const AdapterClass = this.adapters.get(config.type);
    
    if (!AdapterClass) {
      throw new Error(`Unknown adapter type: ${config.type}. Make sure to register the adapter first.`);
    }

    return new AdapterClass(config);
  }

  /**
   * Check if an adapter type is registered
   */
  static isRegistered(type: string): boolean {
    return this.adapters.has(type);
  }

  /**
   * Get list of registered adapter types
   */
  static getRegisteredTypes(): string[] {
    return Array.from(this.adapters.keys());
  }
}

/**
 * Adaptive sync manager that supports fallback adapters
 */
export class AdaptiveSyncManager {
  private primaryAdapter: BaseSyncAdapter;
  private fallbackAdapter?: BaseSyncAdapter;
  private currentAdapter: BaseSyncAdapter;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;

  constructor(primaryConfig: AdapterConfig, fallbackConfig?: AdapterConfig) {
    this.primaryAdapter = SyncAdapterFactory.create(primaryConfig);
    this.currentAdapter = this.primaryAdapter;

    if (fallbackConfig) {
      this.fallbackAdapter = SyncAdapterFactory.create(fallbackConfig);
    }

    // Setup error handling for primary
    this.primaryAdapter.onError(() => this.handlePrimaryError());
  }

  async connect(): Promise<void> {
    try {
      await this.primaryAdapter.connect();
      this.currentAdapter = this.primaryAdapter;
      this.reconnectAttempts = 0;
    } catch (error) {
      console.warn('Primary adapter connection failed:', error);
      
      if (this.fallbackAdapter) {
        console.log('Attempting fallback adapter...');
        await this.fallbackAdapter.connect();
        this.currentAdapter = this.fallbackAdapter;
      } else {
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    await this.primaryAdapter.disconnect();
    await this.fallbackAdapter?.disconnect();
  }

  get adapter(): BaseSyncAdapter {
    return this.currentAdapter;
  }

  isUsingFallback(): boolean {
    return this.currentAdapter === this.fallbackAdapter;
  }

  async switchToPrimary(): Promise<void> {
    if (this.currentAdapter === this.fallbackAdapter && this.fallbackAdapter) {
      try {
        await this.primaryAdapter.connect();
        this.currentAdapter = this.primaryAdapter;
        console.log('Switched back to primary adapter');
      } catch (error) {
        console.warn('Failed to switch to primary:', error);
      }
    }
  }

  private async handlePrimaryError(): Promise<void> {
    if (this.currentAdapter !== this.fallbackAdapter && this.fallbackAdapter) {
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn('Max reconnect attempts reached, switching to fallback');
        try {
          await this.fallbackAdapter.connect();
          this.currentAdapter = this.fallbackAdapter;
        } catch (error) {
          console.error('Fallback adapter also failed:', error);
        }
      }
    }
  }
}
