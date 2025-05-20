import log from 'loglevel';
import type { Logger, LogLevel } from './log-types';

/**
 * Initializes a logger for the browser environment using loglevel.
 * @param debug - Whether to enable debug logging.
 * @param label - Optional label to prefix logs.
 * @returns Logger instance for browser.
 */
export function initBrowserLogger(debug: boolean): Logger {
    const level = debug ? 'debug' : 'info';
    log.setLevel(level);

    return {
        log: (level: LogLevel, message: string) => log[level](message),
        debug: (msg) => log.debug(msg),
        info: (msg) => log.info(msg),
        warn: (msg) => log.warn(msg),
        error: (msg) => log.error(msg),
    };
}
