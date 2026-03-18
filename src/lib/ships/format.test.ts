import { describe, it, expect } from 'vitest';
import {
  formatDimensions,
  formatCrew,
  formatCargo,
  formatSpeed,
  formatProductionStatus,
  formatSize,
} from './format';

describe('formatDimensions', () => {
  it('returns N/A when all dimensions are zero', () => {
    expect(formatDimensions(0, 0, 0)).toBe('N/A');
  });

  it('formats with one decimal place and meters suffix', () => {
    expect(formatDimensions(26.5, 28, 10.2)).toBe('26.5 x 28.0 x 10.2 m');
  });
});

describe('formatCrew', () => {
  it('returns N/A when both are zero', () => {
    expect(formatCrew(0, 0)).toBe('N/A');
  });

  it('returns single number when min equals max', () => {
    expect(formatCrew(3, 3)).toBe('3');
  });

  it('returns range when min differs from max', () => {
    expect(formatCrew(1, 3)).toBe('1-3');
  });
});

describe('formatCargo', () => {
  it('returns None for zero cargo', () => {
    expect(formatCargo(0)).toBe('None');
  });

  it('formats with SCU suffix', () => {
    expect(formatCargo(625)).toBe('625 SCU');
  });
});

describe('formatSpeed', () => {
  it('returns N/A for null', () => {
    expect(formatSpeed(null)).toBe('N/A');
  });

  it('returns N/A for zero', () => {
    expect(formatSpeed(0)).toBe('N/A');
  });

  it('formats with m/s suffix', () => {
    expect(formatSpeed(210)).toBe('210 m/s');
  });
});

describe('formatProductionStatus', () => {
  it('returns Unknown for empty string', () => {
    expect(formatProductionStatus('')).toBe('Unknown');
  });

  it('converts hyphenated slug to title case', () => {
    expect(formatProductionStatus('flight-ready')).toBe('Flight Ready');
  });
});

describe('formatSize', () => {
  it('returns Unknown for empty string', () => {
    expect(formatSize('')).toBe('Unknown');
  });

  it('capitalizes first letter', () => {
    expect(formatSize('capital')).toBe('Capital');
  });
});
