import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from '../src/App';

describe('Zentronyx Frontend App', () => {
  beforeEach(() => {
    // Mark splash screen as seen so landing page renders directly in unit tests
    sessionStorage.setItem('zentronyx_splash_seen', 'true');
  });

  it('renders landing page hero by default for root path', async () => {
    render(<App />);
    const h1 = await screen.findByRole('heading', { level: 1 });
    expect(h1).toBeInTheDocument();
    expect(h1.textContent).toContain('Secure Your Software');
    expect(h1.textContent).toContain('Before It Reaches Production');
    expect(screen.getAllByText(/ZENTRONYX/i).length).toBeGreaterThan(0);
  });

  it('renders security engine explore tabs and capabilities', async () => {
    render(<App />);
    expect(await screen.findByText(/ONE PLATFORM\. COMPLETE SOFTWARE SECURITY\./i)).toBeInTheDocument();
    expect(screen.getAllByText(/Semgrep Engine/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/OSV-Scanner & OSV\.dev/i).length).toBeGreaterThan(0);
  });

  it('renders how it works navigation and preview timeline', async () => {
    render(<App />);
    expect(screen.getAllByText(/How Zentronyx Works/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Create Project/i)).toBeInTheDocument();
    expect(screen.getByText(/Security Scanning/i)).toBeInTheDocument();
  });
});
