import type { Logger, LogLevel } from './log-types';

/**
 * Initializes a logger for Node.js environment using winston.
 * @param debug - Whether to enable debug logging.
 * @param label - Optional label to prefix Node.js logs.
 * @returns Logger instance for Node.js.
 */
export function initNodeLogger(debug: boolean, label?: string): Logger {
    const winston = require('winston');
    const level = debug ? 'debug' : 'info';

    const winstonLogger = winston.createLogger({
        transports: [
            new winston.transports.Console({
                stderrLevels: ['error', 'warn', 'info'],
            }),
        ],
        level: level,
        format: winston.format.combine(
            winston.format.label({ label }),
            winston.format.cli(),
            winston.format.errors({ stack: true }),
            winston.format.printf(({ level, message, stack, label }) => {
                return stack
                    ? `${level} [${label}]: ${message} - ${stack}`
                    : `${level} [${label}]: ${message}`;
            })
        ),
    });

    return {
        log: (level: LogLevel, message: string) =>
            winstonLogger.log({ level, message }),
        debug: (msg) => winstonLogger.debug(msg),
        info: (msg) => winstonLogger.info(msg),
        warn: (msg) => winstonLogger.warn(msg),
        error: (msg) => winstonLogger.error(msg),
    };
}