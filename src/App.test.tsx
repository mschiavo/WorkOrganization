import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  it('renders the WorkOrganizer title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /workorganizer/i, level: 1 })).toBeInTheDocument();
  });
});
