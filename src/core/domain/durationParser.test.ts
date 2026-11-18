import { describe, it, expect } from 'vitest';
import { parseFlexibleDuration, formatFlexibleDuration } from './durationParser';

describe('durationParser Domain Engine', () => {
  describe('parseFlexibleDuration', () => {
    it('interprets plain number string as hours (e.g. "3" -> 180m)', () => {
      expect(parseFlexibleDuration('3')).toBe(180);
      expect(parseFlexibleDuration(3)).toBe(180);
      expect(parseFlexibleDuration('1')).toBe(60);
      expect(parseFlexibleDuration('8')).toBe(480);
    });

    it('interprets "Xh" as hours (e.g. "3h", "3H" -> 180m)', () => {
      expect(parseFlexibleDuration('3h')).toBe(180);
      expect(parseFlexibleDuration('3H')).toBe(180);
      expect(parseFlexibleDuration(' 4h ')).toBe(240);
    });

    it('interprets "Xm" as minutes (e.g. "50m", "50M" -> 50m)', () => {
      expect(parseFlexibleDuration('50m')).toBe(50);
      expect(parseFlexibleDuration('50M')).toBe(50);
      expect(parseFlexibleDuration('15m')).toBe(15);
      expect(parseFlexibleDuration('90m')).toBe(90);
    });

    it('interprets combined "XhY" and "XhYm" (e.g. "3h50", "3h50m", "3H50M" -> 230m)', () => {
      expect(parseFlexibleDuration('3h50')).toBe(230); // 3*60 + 50 = 230
      expect(parseFlexibleDuration('3h50m')).toBe(230);
      expect(parseFlexibleDuration('3H50M')).toBe(230);
      expect(parseFlexibleDuration('1h15m')).toBe(75);
      expect(parseFlexibleDuration('2h5')).toBe(125);
    });

    it('interprets colon time notation "HH:mm" (e.g. "3:50", "03:50" -> 230m)', () => {
      expect(parseFlexibleDuration('3:50')).toBe(230);
      expect(parseFlexibleDuration('03:50')).toBe(230);
      expect(parseFlexibleDuration('01:30')).toBe(90);
    });

    it('interprets decimal hours (e.g. "1.5", "1.5h", "1,5h" -> 90m)', () => {
      expect(parseFlexibleDuration('1.5')).toBe(90);
      expect(parseFlexibleDuration('1.5h')).toBe(90);
      expect(parseFlexibleDuration('1,5h')).toBe(90);
      expect(parseFlexibleDuration('0.5h')).toBe(30);
    });

    it('returns 0 for empty, null, or invalid inputs', () => {
      expect(parseFlexibleDuration('')).toBe(0);
      expect(parseFlexibleDuration('   ')).toBe(0);
      expect(parseFlexibleDuration('abc')).toBe(0);
      expect(parseFlexibleDuration('0')).toBe(0);
    });
  });

  describe('formatFlexibleDuration', () => {
    it('formats minutes into concise human-readable duration strings', () => {
      expect(formatFlexibleDuration(180)).toBe('3h');
      expect(formatFlexibleDuration(230)).toBe('3h 50m');
      expect(formatFlexibleDuration(50)).toBe('50m');
      expect(formatFlexibleDuration(75)).toBe('1h 15m');
      expect(formatFlexibleDuration(0)).toBe('');
      expect(formatFlexibleDuration(-10)).toBe('');
    });
  });
});
