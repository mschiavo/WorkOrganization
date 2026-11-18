import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DurationInput } from './DurationInput';

describe('DurationInput Component', () => {
  it('renders with formatted value if provided in minutes', () => {
    render(<DurationInput value={180} onChange={vi.fn()} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('3h');
  });

  it('allows typing flexible text formats and calls onChange with parsed minutes on blur', () => {
    const handleChange = vi.fn();
    render(<DurationInput value={0} onChange={handleChange} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    // Type "3h50"
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '3h50' } });
    expect(input.value).toBe('3h50');

    fireEvent.blur(input);
    // 3*60 + 50 = 230
    expect(handleChange).toHaveBeenCalledWith(230);
  });

  it('interprets plain number as hours (e.g. typing "3" results in 180m)', () => {
    const handleChange = vi.fn();
    render(<DurationInput value={0} onChange={handleChange} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.blur(input);

    expect(handleChange).toHaveBeenCalledWith(180);
  });

  it('interprets "50m" as 50 minutes', () => {
    const handleChange = vi.fn();
    render(<DurationInput value={0} onChange={handleChange} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '50m' } });
    fireEvent.blur(input);

    expect(handleChange).toHaveBeenCalledWith(50);
  });
});
