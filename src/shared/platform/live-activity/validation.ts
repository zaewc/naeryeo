import { LiveActivityError, type LiveActivityInput } from './live-activity.types';

export function validateId(id: string): void {
  if (!/^[A-Za-z0-9._:-]{1,64}$/.test(id)) throw new LiveActivityError('invalid-payload');
}

export function validateInput(input: LiveActivityInput): void {
  validateId(input.id);
  const { totalStops, completedStops, phase, etaEpochMillis } = input;
  const validOptionalText = (value: string | undefined, max: number) =>
    value === undefined || (value.trim().length > 0 && value.length <= max);
  if (input.title.trim().length === 0 || input.title.length > 120 || input.body.length > 240 ||
    !validOptionalText(input.subtitle, 60) || !validOptionalText(input.chipText, 16) ||
    !Number.isInteger(totalStops) || totalStops < 1 || totalStops > 300 ||
    !Number.isInteger(completedStops) || completedStops < 0 || completedStops > totalStops ||
    !['tracking', 'approaching', 'arrived'].includes(phase) ||
    (phase === 'arrived' && completedStops !== totalStops) ||
    (phase === 'tracking' && completedStops === totalStops) ||
    (phase === 'approaching' && totalStops - completedStops !== 1) ||
    (etaEpochMillis !== undefined && (!Number.isInteger(etaEpochMillis) ||
      etaEpochMillis <= 0 || etaEpochMillis > 8_640_000_000_000_000))) {
    throw new LiveActivityError('invalid-payload');
  }
}
