type LogModule = 'AUTH' | 'MENU' | 'TABLES' | 'ORDERS' | 'BILLING' | 'STAFF' | 'ANALYTICS' | 'SYSTEM' | 'KITCHEN';
type LogAction = string;
type LogStatus = 'START' | 'SUCCESS' | 'ERROR' | 'INFO' | 'DEBUG' | 'WARN';

const IS_PROD = import.meta.env.PROD;

class Logger {
  private formatMessage(module: LogModule, action: LogAction, status: LogStatus, message?: string) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${module}] [${action}] [${status}]${message ? ` - ${message}` : ''}`;
  }

  info(module: LogModule, action: LogAction, message?: string, payload?: any) {
    if (IS_PROD) return;
    console.log(this.formatMessage(module, action, 'INFO', message), payload ?? '');
  }

  start(module: LogModule, action: LogAction, message?: string, payload?: any) {
    if (IS_PROD) return;
    console.log(this.formatMessage(module, action, 'START', message), payload ?? '');
  }

  success(module: LogModule, action: LogAction, message?: string, payload?: any) {
    if (IS_PROD) return;
    console.log(`%c${this.formatMessage(module, action, 'SUCCESS', message)}`, 'color: #22c55e; font-weight: bold;', payload ?? '');
  }

  error(module: LogModule, action: LogAction, error: any, message?: string) {
    // Errors always log — even in production (no sensitive data in message)
    console.error(`%c${this.formatMessage(module, action, 'ERROR', message)}`, 'color: #ef4444; font-weight: bold;');
    console.error('Error Details:', error);
    if (error?.stack) console.error(error.stack);
  }

  warn(module: LogModule, action: LogAction, message?: string, payload?: any) {
    console.warn(`%c${this.formatMessage(module, action, 'WARN', message)}`, 'color: #f59e0b; font-weight: bold;', payload ?? '');
  }

  debug(module: LogModule, action: LogAction, message?: string, payload?: any) {
    if (IS_PROD) return;
    console.debug(`%c${this.formatMessage(module, action, 'DEBUG', message)}`, 'color: #8b5cf6;', payload ?? '');
  }
}

export const logger = new Logger();
