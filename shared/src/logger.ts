    /**
   * Initializes a logger that works in both Node.js and browser environments.
   * @param debug - Enables debug logging if true.
   * @param label - Optional label to prefix Node.js logs.
   * @returns Logger instance
   */
  export async function initLogger(debug: boolean, label?: string): Promise<Logger> {
    if (typeof window === "undefined") {
      return initNodeLogger(debug, label);
    } else {
      return await initBrowserLogger(debug, label);
    }
  }
  
  /**
   * Initializes a logger for Node.js environment using winston.
   * @param debug - Whether to enable debug logging.
   * @param label - Optional label to prefix Node.js logs.
   * @returns Logger instance for Node.js.
   */
  async function initNodeLogger(debug: boolean, label?: string): Promise<Logger> {
    const winston = await import('winston');
    const level = debug ? 'debug' : 'info';
  
    const loggerInstance =  winston.createLogger({
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
  
    const methodMap = {
      0: 'debug',
      1: 'info',
      2: 'warn',
      3: 'error',
    };
  
    const levelNumber = Object.entries(methodMap).find(
      ([_, v]) => v === level
    )?.[0];
  
    return {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
      methodMap,
      level: Number(levelNumber ?? 1), // default to INFO
      log(level: number, msg: string) {
        const method = methodMap[level] || 'info';
        loggerInstance[method](msg);
      },
    };
  }
  
  /**
   * Initializes a logger for the browser environment using loglevel.
   * @param debug - Whether to enable debug logging.
   * @param label - Optional label to prefix logs.
   * @returns Logger instance for browser.
   */
  async function initBrowserLogger(debug: boolean, label?: string): Promise<Logger> {
    const { default: log } = await import('loglevel');
    const level = debug ? 'debug' : 'info';
    log.setLevel(level);
  
    const methodMap = {
      0: 'debug',
      1: 'info',
      2: 'warn',
      3: 'error',
    };
  
    const levelNumber = Object.entries(methodMap).find(
      ([_, v]) => v === level
    )?.[0];
  
    return {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
      methodMap,
      level: Number(levelNumber ?? 1),
      log(level: number, msg: string) {
        const method = methodMap[level] || 'info';
        log[method](`[${method.toUpperCase()}] ${label ? `[${label}] ` : ''}${msg}`);
      },
    };
  }
  
  