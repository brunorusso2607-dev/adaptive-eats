/**
 * Development-only logging utility
 * 
 * In production, logs are suppressed to improve performance and avoid exposing debug info.
 * In development, logs work normally with enhanced formatting.
 * 
 * Usage:
 * import { devLog, devWarn, devError } from '@/lib/devLog';
 * 
 * devLog('Message', data);           // console.log equivalent
 * devWarn('Warning message');         // console.warn equivalent
 * devError('Error message', error);   // console.error equivalent
 * devLog.group('Group name');         // console.group
 * devLog.groupEnd();                  // console.groupEnd
 * devLog.table(data);                 // console.table
 */

const isDev = import.meta.env.DEV;

type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'debug';

interface DevLogOptions {
  /** Force logging even in production (use sparingly) */
  force?: boolean;
  /** Add timestamp to log */
  timestamp?: boolean;
  /** Custom prefix for the log */
  prefix?: string;
}

/**
 * Core logging function
 */
function log(level: LogLevel, args: unknown[], options: DevLogOptions = {}): void {
  if (!isDev && !options.force) return;
  
  const finalArgs: unknown[] = [];
  
  if (options.prefix) {
    finalArgs.push(`[${options.prefix}]`);
  }
  
  if (options.timestamp) {
    finalArgs.push(`[${new Date().toISOString()}]`);
  }
  
  finalArgs.push(...args);
  
  console[level](...finalArgs);
}

/**
 * Development log - equivalent to console.log
 */
export function devLog(...args: unknown[]): void {
  log('log', args);
}

/**
 * Development warning - equivalent to console.warn
 */
export function devWarn(...args: unknown[]): void {
  log('warn', args);
}

/**
 * Development error - equivalent to console.error
 * Note: Errors are ALWAYS logged, even in production
 */
export function devError(...args: unknown[]): void {
  log('error', args, { force: true });
}

/**
 * Development info - equivalent to console.info
 */
export function devInfo(...args: unknown[]): void {
  log('info', args);
}

/**
 * Development debug - equivalent to console.debug
 */
export function devDebug(...args: unknown[]): void {
  log('debug', args);
}

/**
 * Log with custom prefix (useful for module-specific logs)
 */
export function createPrefixedLogger(prefix: string) {
  return {
    log: (...args: unknown[]) => log('log', args, { prefix }),
    warn: (...args: unknown[]) => log('warn', args, { prefix }),
    error: (...args: unknown[]) => log('error', args, { prefix, force: true }),
    info: (...args: unknown[]) => log('info', args, { prefix }),
    debug: (...args: unknown[]) => log('debug', args, { prefix }),
  };
}

// Extended methods attached to devLog
devLog.group = (...args: unknown[]): void => {
  if (!isDev) return;
  console.group(...args);
};

devLog.groupCollapsed = (...args: unknown[]): void => {
  if (!isDev) return;
  console.groupCollapsed(...args);
};

devLog.groupEnd = (): void => {
  if (!isDev) return;
  console.groupEnd();
};

devLog.table = (data: unknown): void => {
  if (!isDev) return;
  console.table(data);
};

devLog.time = (label: string): void => {
  if (!isDev) return;
  console.time(label);
};

devLog.timeEnd = (label: string): void => {
  if (!isDev) return;
  console.timeEnd(label);
};

devLog.count = (label?: string): void => {
  if (!isDev) return;
  console.count(label);
};

devLog.clear = (): void => {
  if (!isDev) return;
  console.clear();
};

// Pre-configured loggers for common modules
export const pwaLog = createPrefixedLogger('PWA');
export const authLog = createPrefixedLogger('Auth');
export const mealPlanLog = createPrefixedLogger('MealPlan');
export const safetyLog = createPrefixedLogger('Safety');
export const apiLog = createPrefixedLogger('API');

export default devLog;
