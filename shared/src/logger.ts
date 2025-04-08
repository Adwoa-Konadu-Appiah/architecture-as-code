export type LoggerL = {
    info: (...args: any[]) => void;
    debug: (...args: any[]) => void;
  };
  
  let loggerInstance: LoggerL;
  
  /**
   * Initializes a logger that works in both Node.js and browser environments.
   * @param debug - Enables debug logging if true.
   * @param label - Optional label to prefix Node.js logs.
   * @returns Logger instance
   */
  export async function initLogger(debug: boolean, label?: string): Promise<LoggerL> {
    const level = debug ? "debug" : "info";
  
    if (typeof window === "undefined") {
      // Node.js: use winston
      const winston = await import("winston");
  
      return winston.createLogger({
        transports: [
          new winston.transports.Console({
              //This seems odd, but we want to allow users to parse JSON output from the STDOUT. We can't do that if it's polluted.
            stderrLevels: ["error", "warn", "info"],
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
    } else {
      // Browser: use loglevel
      const log = require("loglevel");
      log.setLevel(level);
  
      loggerInstance = {
        info: (...args: any[]) => log.info(`[INFO] [${label}]`, ...args),
        debug: (...args: any[]) => log.debug(`[DEBUG] [${label}]`, ...args),
      };
  
      return loggerInstance;
    }
  }
  