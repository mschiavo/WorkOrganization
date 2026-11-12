import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeInput } from './TimeInput';

describe('TimeInput Component', () => {
  it('renders time input with initial value and keeps native type="time"', () => {
    render(<TimeInput value="08:30" data-testid="test-time-input" />);
    const input = screen.getByTestId('test-time-input') as HTMLInputElement;

    expect(input).toBeInTheDocument();
    expect(input.type).toBe('time');
    expect(input.value).toBe('08:30');
  });

  it('allows keyboard typing and calls onChange without losing intermediate state', () => {
    const handleChange = vi.fn();
    render(
      <TimeInput
        value="08:00"
        onChange={handleChange}
        data-testid="test-time-input"
      />
    );

    const input = screen.getByTestId('test-time-input') as HTMLInputElement;

    // Simulate focus
    fireEvent.focus(input);

    // Simulate typing minutes "54"
    fireEvent.change(input, { target: { value: '08:54' } });

    expect(input.value).toBe('08:54');
    expect(handleChange).toHaveBeenCalledWith('08:54');

    // Simulate blur
    fireEvent.blur(input);
    expect(input.value).toBe('08:54');
  });

  it('updates local value when external value changes while not focused', () => {
    const { rerender } = render(
      <TimeInput value="09:00" data-testid="test-time-input" />
    );

    const input = screen.getByTestId('test-time-input') as HTMLInputElement;
    expect(input.value).toBe('09:00');

    rerender(<TimeInput value="10:15" data-testid="test-time-input" />);
    expect(input.value).toBe('10:15');
  });

  it('respects disabled prop', () => {
    render(<TimeInput value="08:00" disabled={true} data-testid="test-time-input" />);
    const input = screen.getByTestId('test-time-input') as HTMLInputElement;
    expect(input).toBeDisabled();
  });
});
