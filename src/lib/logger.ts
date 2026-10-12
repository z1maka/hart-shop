export type LogContext = Record<string, unknown>

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type Logger = Record<LogLevel, (message: string, context?: LogContext) => void>

const isStructured = process.env.NODE_ENV === 'production'

function serializeContext(context: LogContext): LogContext {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      value instanceof Error
        ? { name: value.name, message: value.message, stack: value.stack }
        : value,
    ]),
  )
}

function write(level: LogLevel, message: string, context?: LogContext): void {
  const payload = context ? serializeContext(context) : undefined

  if (isStructured) {
    console[level](
      JSON.stringify({ level, message, timestamp: new Date().toISOString(), ...payload }),
    )
    return
  }

  if (payload) {
    console[level](`[${level}] ${message}`, payload)
    return
  }

  console[level](`[${level}] ${message}`)
}

export const logger: Logger = {
  debug: (message, context) => write('debug', message, context),
  info: (message, context) => write('info', message, context),
  warn: (message, context) => write('warn', message, context),
  error: (message, context) => write('error', message, context),
}
