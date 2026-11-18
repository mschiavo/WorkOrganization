import React, { useState, useEffect, useRef } from 'react';
import { parseFlexibleDuration, formatFlexibleDuration } from '../../core/domain/durationParser';

export interface DurationInputProps {
  value?: number; // Minutes
  onChange: (minutes: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  'data-testid'?: string;
}

export const DurationInput: React.FC<DurationInputProps> = ({
  value = 0,
  onChange,
  placeholder = 'es. 3h, 50m, 3h50',
  className,
  disabled = false,
  'data-testid': testId,
}) => {
  const [text, setText] = useState<string>(() => formatFlexibleDuration(value));
  const isFocusedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setText(formatFlexibleDuration(value));
    }
  }, [value]);

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setText(raw);
    const minutes = parseFlexibleDuration(raw);
    onChange(minutes);
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    const minutes = parseFlexibleDuration(text);
    onChange(minutes);
    setText(formatFlexibleDuration(minutes));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="text"
      value={text}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      data-testid={testId}
    />
  );
};
