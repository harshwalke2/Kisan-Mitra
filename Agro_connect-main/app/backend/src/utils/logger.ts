type LogMethod = (...args: unknown[]) => void;

const formatArgs = (args: unknown[]) => {
  if (args.length === 0) {
    return [];
  }

  return [`[${new Date().toISOString()}]`, ...args];
};

const createLoggerMethod = (method: LogMethod): LogMethod => {
  return (...args: unknown[]) => {
    method(...formatArgs(args));
  };
};

export const logger = {
  info: createLoggerMethod(console.log),
  warn: createLoggerMethod(console.warn),
  error: createLoggerMethod(console.error),
};