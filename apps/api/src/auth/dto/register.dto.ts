import { z } from 'zod';
import { UserRole, OrganizationLegalType } from '@intender/shared';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum([UserRole.BUYER, UserRole.SUPPLIER]),
  legalType: z.enum([OrganizationLegalType.IP, OrganizationLegalType.TOO, OrganizationLegalType.OTHER]),
  legalName: z.string().min(2),
  bin: z.string().regex(/^\d{12}$/, 'БИН/ИИН должен состоять из 12 цифр'),
});

export type RegisterDto = z.infer<typeof registerSchema>;
