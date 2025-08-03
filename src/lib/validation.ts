import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3, 'Min. 3 znaki'),
  email: z.string().email('Nieprawidłowy e-mail'),
  password: z.string().min(6, 'Min. 6 znaków'),
  confirm: z.string(),
}).refine((data) => data.password === data.confirm, {
  message: 'Hasła nie są takie same',
  path: ['confirm'],
});

export type RegisterData = z.infer<typeof registerSchema>;
