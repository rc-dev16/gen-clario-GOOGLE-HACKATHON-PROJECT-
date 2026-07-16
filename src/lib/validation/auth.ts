const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function validateEmail(email: string): string | null {
  if (!EMAIL_PATTERN.test(email.trim())) {
    return 'Please enter a valid email address.';
  }

  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) {
    return 'Password must be at least 6 characters long.';
  }

  return null;
}

export function validateDisplayName(name: string): string | null {
  if (!name.trim()) {
    return 'Please enter your name.';
  }

  return null;
}
