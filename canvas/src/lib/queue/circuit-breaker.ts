import "server-only";

export interface CircuitBreakerState {
  provider: string;
  failureCount: number;
  lastFailureAt: Date;
  isOpen: boolean;
}

const FAILURE_THRESHOLD = 5;
const CIRCUIT_BREAK_DURATION = 5 * 60 * 1000;

const circuitBreakers = new Map<string, CircuitBreakerState>();

export function getCircuitBreaker(provider: string): CircuitBreakerState | undefined {
  return circuitBreakers.get(provider);
}

export function isCircuitOpen(provider: string): boolean {
  const state = circuitBreakers.get(provider);
  if (!state) return false;

  if (state.isOpen) {
    const elapsed = Date.now() - state.lastFailureAt.getTime();
    if (elapsed > CIRCUIT_BREAK_DURATION) {
      circuitBreakers.set(provider, {
        provider,
        failureCount: 0,
        lastFailureAt: new Date(),
        isOpen: false,
      });
      return false;
    }
    return true;
  }

  return false;
}

export function recordFailure(provider: string): void {
  const state = circuitBreakers.get(provider) ?? {
    provider,
    failureCount: 0,
    lastFailureAt: new Date(),
    isOpen: false,
  };

  state.failureCount++;
  state.lastFailureAt = new Date();

  if (state.failureCount >= FAILURE_THRESHOLD) {
    state.isOpen = true;
    console.error(`[CircuitBreaker] Provider ${provider} opened due to ${state.failureCount} consecutive failures`);
  }

  circuitBreakers.set(provider, state);
}

export function recordSuccess(provider: string): void {
  const state = circuitBreakers.get(provider);
  if (state) {
    state.failureCount = 0;
    state.isOpen = false;
    circuitBreakers.set(provider, state);
  }
}

export function resetCircuitBreaker(provider: string): void {
  circuitBreakers.delete(provider);
}

export function getAllCircuitBreakers(): CircuitBreakerState[] {
  return Array.from(circuitBreakers.values());
}
