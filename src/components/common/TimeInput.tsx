import React, { useState, useEffect, useRef } from 'react';

export interface TimeInputProps {
  value?: string; // "HH:mm"
  disabled?: boolean;
  className?: string;
  'data-testid'?: string;
  onChange?: (value: string) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  title?: string;
}

/**
 * TimeInput component that handles keyboard input seamlessly without
 * React parent re-renders interfering with multi-digit typing (e.g. typing "54" in minutes),
 * while preserving the native browser time picker and spin buttons.
 */
export const TimeInput: React.FC<TimeInputProps> = ({
  value = '',
  disabled = false,
  className,
  'data-testid': testId,
  onChange,
  onFocus,
  onBlur,
  title,
}) => {
  const [localValue, setLocalValue] = useState<string>(value);
  const isFocusedRef = useRef(false);

  // Synchronize with external value when the field is not actively focused
  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalValue(newVal);
    onChange?.(newVal);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = false;
    onChange?.(localValue);
    onBlur?.(e);
  };

  return (
    <input
      type="time"
      data-testid={testId}
      className={className}
      value={localValue}
      disabled={disabled}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      title={title}
    />
  );
};
