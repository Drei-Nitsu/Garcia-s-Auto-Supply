export const VAT_RATE = Number(import.meta.env.VITE_VAT_RATE ?? 0.12);
export const STORE_NAME = (import.meta.env.VITE_STORE_NAME as string) || 'Auto Supply';
export const STORE_ADDRESS = (import.meta.env.VITE_STORE_ADDRESS as string) || '';

const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
});

export const peso = (n: number | null | undefined) => pesoFormatter.format(Number(n ?? 0));

/** Round to centavos, avoiding floating-point drift */
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' });

export const cn = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');
