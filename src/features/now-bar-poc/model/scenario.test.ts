import { expect, test } from '@jest/globals';

import { getPocStep, POC_ID } from './scenario';

test('manual scenario has stable identity and reaches arrival via approaching', () => {
  const steps = [0, 1, 2, 3].map(getPocStep);
  expect(steps.map(step => step?.id)).toEqual([POC_ID, POC_ID, POC_ID, POC_ID]);
  expect(steps.map(step => step?.phase)).toEqual(['tracking', 'tracking', 'approaching', 'arrived']);
  expect(steps.map(step => step ? step.totalStops - step.completedStops : null)).toEqual([3, 2, 1, 0]);
  expect(getPocStep(4)).toBeUndefined();
  expect(getPocStep(-1)).toBeUndefined();
});
