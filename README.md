# TypeScript Method Tracing Utility

Drop-in solution to help agentic AI find what files it needs to read to add to the context for iterative development (cursor composer, openhands, cline, etc).

## What it does

logs function inputs:

```json
{
  "event": "function_call",
  "file": "src/services/MyService.ts",
  "function": "getData",
  "class": "MyService",
  "timestamp": "2024-01-17T01:42:51.123Z",
  "args": ["param1", "param2"]
}
```

logs function outputs:

```json
{
  "event": "function_return",
  "file": "src/services/MyService.ts",
  "function": "getData",
  "class": "MyService",
  "timestamp": "2024-01-17T01:42:51.123Z",
  "returnValue": "result"
}
```

## Setup

1. Copy this file into your project's utils folder
2. Enable decorators in your tsconfig.json:

```json
{
    "compilerOptions": {
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true
    }
}
```

## Basic Usage

```typescript
import { traceClass } from './utils/trace';

@traceClass()
class MyClass {
    async myMethod() {
        console.log('Executing myMethod');
    }
}
```

Or, you could trace a single method:

```typescript
import { traceMethod } from './utils/trace';

class MyClass {
    @traceMethod()
    async myMethod() {
        console.log('Executing myMethod');
    }
}
```

## License

MIT

## Author

Raymond Xu (@ryx2)
