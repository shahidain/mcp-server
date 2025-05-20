// Add missing types for tedious package

interface ErrorOptions {
  cause?: unknown;
}

interface AggregateError extends Error {
  errors: any[];
}

export {};
