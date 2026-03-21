import type { DistributionStrategy } from '../types.js';
import { randomUnique } from './strategies/randomUnique.js';

const strategies = new Map<string, DistributionStrategy>([
  [randomUnique.name, randomUnique],
]);

export function getDistributionStrategy(name: string): DistributionStrategy {
  const strategy = strategies.get(name);
  if (!strategy) {
    throw new Error(`Unknown distribution strategy: "${name}"`);
  }
  return strategy;
}
