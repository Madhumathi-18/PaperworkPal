import { axe } from 'jest-axe';
import { expect } from 'vitest';

/** Fails with a readable list of problems if axe finds any accessibility violation. */
export async function expectNoA11yViolations(container: Element): Promise<void> {
  const results = await axe(container);
  const summary = results.violations.map(
    (violation) => `${violation.id}: ${violation.help} (${violation.nodes.length} element(s))`,
  );
  expect(summary).toEqual([]);
}
