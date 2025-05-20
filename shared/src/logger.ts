import { initBrowserLogger } from "./browser-logger";
import { Logger } from "./log-types";
import { initNodeLogger } from "./node-logger";

let loggerInstance: Logger;

/**
 * Initializes a logger that works in both Node.js and browser environments.
 * @param debug - Enables debug logging if true.
 * @param label - Optional label to prefix Node.js logs.
 * @returns Logger instance
 */
export function initLogger(debug: boolean, label?: string): Logger {
    if (loggerInstance) return loggerInstance;
    if (typeof window === 'undefined') {
        return initNodeLogger(debug, label);
    } else {
        return initBrowserLogger(debug);
    }
}
