/**
 * TypeScript Method Tracing Utility
 * --------------------------------
 * 
 * This utility provides automatic method tracing for TypeScript classes using decorators.
 * It's designed to be a drop-in solution for debugging and monitoring method execution flow.
 * Great for allowing coding AI agents to see the stack trace from terminal being put back into prompts. 
 /**
 * TypeScript Method Tracing Utility
 * --------------------------------
 * 
 * This utility provides automatic method tracing for TypeScript classes using decorators.
 * It's designed to be a drop-in solution for debugging and monitoring method execution flow.
 * 
 * To use this file:
 * 1. Copy this file into your project's utils folder
 * 2. Enable decorators in your tsconfig.json:
 *    {
 *      "compilerOptions": {
 *        "experimentalDecorators": true,
 *        "emitDecoratorMetadata": true
 *      }
 *    }
 * 
 * Basic usage:
 * ```typescript
 * import { traceClass } from './utils/trace';
 * 
 * @traceClass()
 * class MyService {
 *   async getData() { ... }     // automatically traced
 *   async saveData() { ... }    // automatically traced
 * }
 * ```
 * 
 * Excluding methods:
 * ```typescript
 * @traceClass({ excludeMethods: ["helperMethod"] })
 * class MyService {
 *   async getData() { ... }        // traced
 *   private helperMethod() { ... } // not traced
 * }
 * ```
 * 
 * The tracer will automatically log:
 * - Method entry with arguments
 * - Method exit with return value
 * - Errors with stack traces
 * - Execution time
 * - File paths (relative to project root)
 * - Class and method names
 * 
 * Example output:
 * ```json
 * {
 *   "event": "function_call",
 *   "file": "src/services/MyService.ts",
 *   "function": "getData",
 *   "class": "MyService",
 *   "timestamp": "2024-01-17T01:42:51.123Z",
 *   "args": ["param1", "param2"]
 * }
 * ```
 * 
 * Features:
 * - Zero configuration required
 * - Automatic file path detection
 * - Async method support
 * - Error tracking
 * - Performance timing
 * - Method exclusion
 * - TypeScript type safety
 * 
 * Note: This utility uses console.log by default. For production use,
 * you might want to modify the Tracer.log method to use your preferred
 * logging system.
 * 
 * @license MIT
 * @author Raymond Xu (@ryx2)
 */

import { performance } from "perf_hooks"
import { relative, join } from "path"

// Set this to the repo root (relative to this current file)
const REPO_ROOT = join(__dirname, "../..")

/**
 * Interface for trace log entry
 */
interface TraceLog {
  event: "function_call" | "function_return" | "class_init" | "class_destroy"
  file: string
  function?: string
  class?: string
  args?: unknown[]
  returnValue?: unknown
  error?: {
    name: string
    message: string
    stack?: string
  }
}

/**
 * Options for trace decorator
 */
interface TraceOptions {
  functionName?: string
  excludeMethods?: string[]
}

/**
 * Class to handle trace logging
 */
export class Tracer {
  private static instance: Tracer
  private constructor() {}

  public static getInstance(): Tracer {
    if (!Tracer.instance) {
      Tracer.instance = new Tracer()
    }
    return Tracer.instance
  }

  /**
   * Log a trace entry
   */
  public log(entry: TraceLog): void {
    const seen = new WeakSet();
    console.log(JSON.stringify(entry, (key, value) => {
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack
        }
      }
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value
    }))
  }
}

/**
 * Get relative file path from error stack
 */
function getRelativeFilePath(): string {
  const stackLine = new Error().stack?.split("\n")[3] // Skip 3 lines to get caller's caller
  const match = stackLine?.match(/\((.+?):\d+/)
  const absolutePath = match?.[1] || "unknown"
  return relative(REPO_ROOT, absolutePath)
}

/**
 * Wrap a method with tracing
 */
function wrapMethodWithTracing(
  method: Function,
  options: { 
    functionName: string, 
    className: string,
    file: string,
    tracer: Tracer 
  }
): Function {
  return function (this: any, ...args: unknown[]) {
    const startTime = new Date().toISOString()
    const startPerf = performance.now()

    options.tracer.log({
      event: "function_call",
      file: options.file,
      function: options.functionName,
      class: options.className,
      args
    })

    try {
      // Call the method and handle both sync and async results
      const result = method.apply(this, args)
      
      // If the result is a promise, handle it asynchronously
      if (result instanceof Promise) {
        return result.then(asyncResult => {
          const endTime = new Date().toISOString()
          const duration = performance.now() - startPerf

          options.tracer.log({
            event: "function_return",
            file: options.file,
            function: options.functionName,
            class: options.className,
            returnValue: asyncResult,
          })

          return asyncResult
        }).catch(error => {
          const endTime = new Date().toISOString()
          const duration = performance.now() - startPerf

          options.tracer.log({
            event: "function_return",
            file: options.file,
            function: options.functionName,
            class: options.className,
            error: error instanceof Error ? error : new Error(String(error)),
          })

          throw error
        })
      }

      // Handle synchronous result
      const endTime = new Date().toISOString()
      const duration = performance.now() - startPerf

      options.tracer.log({
        event: "function_return",
        file: options.file,
        function: options.functionName,
        class: options.className,
        returnValue: result,
      })

      return result
    } catch (error) {
      const endTime = new Date().toISOString()
      const duration = performance.now() - startPerf

      options.tracer.log({
        event: "function_return",
        file: options.file,
        function: options.functionName,
        class: options.className,
        error: error instanceof Error ? error : new Error(String(error)),
      })

      throw error
    }
  }
}

/**
 * Method decorator for tracing function calls
 */
export function trace(options: TraceOptions = {}) {
  const tracer = Tracer.getInstance()
  const filePath = getRelativeFilePath()
  
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor?: PropertyDescriptor
  ): any {
    if (!descriptor) return

    const originalMethod = descriptor.value
    descriptor.value = wrapMethodWithTracing(originalMethod, {
      functionName: options.functionName || String(propertyKey),
      className: target.constructor.name,
      file: filePath,
      tracer
    })

    return descriptor
  }
}

/**
 * Class decorator for tracing class lifecycle and all methods
 */
export function traceClass(options: TraceOptions = {}) {
  const filePath = getRelativeFilePath()
  const tracer = Tracer.getInstance()
  const excludeMethods = new Set(options.excludeMethods || [])
  
  return function <T extends new (...args: any[]) => any>(constructor: T): T {
    // Get all method names from the prototype
    const methodNames = Object.getOwnPropertyNames(constructor.prototype)
      .filter(name => {
        const descriptor = Object.getOwnPropertyDescriptor(constructor.prototype, name)
        return (
          name !== "constructor" && 
          !excludeMethods.has(name) &&
          typeof descriptor?.value === "function"
        )
      })

    // Create a new class that extends the original
    return class extends constructor {
      constructor(...args: any[]) {
        tracer.log({
          event: "class_init",
          file: filePath,
          class: constructor.name,
          args
        })

        super(...args)

        // Wrap all methods with tracing
        methodNames.forEach(methodName => {
          const method = this[methodName as keyof this]
          if (typeof method === "function") {
            Object.defineProperty(this, methodName, {
              value: wrapMethodWithTracing(method.bind(this), {
                functionName: methodName,
                className: constructor.name,
                file: filePath,
                tracer
              }),
              configurable: true,
              writable: true,
              enumerable: true
            })
          }
        })
      }
    }
  }
} 
