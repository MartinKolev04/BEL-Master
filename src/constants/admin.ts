export const ADMIN_EMAIL = 'marthard2004@gmail.com';

export const isAdminEmail = (email: string | null | undefined): boolean =>
  email === ADMIN_EMAIL;
