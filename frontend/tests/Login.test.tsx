import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../src/hooks/useAuth';
import { Login } from '../src/pages/Login';

describe('Login Component', () => {
  it('renders login form elements and accepts input', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );

    const userInput = screen.getByPlaceholderText(/developer@zentronyx.com/i) as HTMLInputElement;
    const pwdInput = screen.getByPlaceholderText(/••••••••••••/i) as HTMLInputElement;

    fireEvent.change(userInput, { target: { value: 'secdev_user' } });
    fireEvent.change(pwdInput, { target: { value: 'MySecretPassword123' } });

    expect(userInput.value).toBe('secdev_user');
    expect(pwdInput.value).toBe('MySecretPassword123');
  });
});
