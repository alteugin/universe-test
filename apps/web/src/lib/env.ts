import 'server-only';

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
};

export const env = {
  get PRODUCTS_API_URL(): string {
    return required('PRODUCTS_API_URL');
  },
};
