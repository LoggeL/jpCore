import { z } from 'zod';

export const EmailInput = z.string().trim().toLowerCase().email();
export const PasswordInput = z.string().min(8).max(256);
export const NameInput = z.string().trim().min(1).max(120);

export const LoginBody = z.object({
  email: EmailInput,
  password: z.string().min(1).max(256),
});
export type LoginBody = z.infer<typeof LoginBody>;

export const SendPasswordResetBody = z.object({
  email: EmailInput,
});
export type SendPasswordResetBody = z.infer<typeof SendPasswordResetBody>;

export const ResetPasswordBody = z.object({
  token: z.string().min(32).max(256),
  password: PasswordInput,
});
export type ResetPasswordBody = z.infer<typeof ResetPasswordBody>;

export const VerifyEmailBody = z.object({
  token: z.string().min(32).max(256),
});
export type VerifyEmailBody = z.infer<typeof VerifyEmailBody>;

export const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: PasswordInput,
});
export type ChangePasswordBody = z.infer<typeof ChangePasswordBody>;

export const AdminRegisterBody = z.object({
  name: NameInput,
  email: EmailInput,
  password: PasswordInput.optional(),
  roles: z.array(z.enum(['admin', 'user'])).min(1).default(['user']),
});
export type AdminRegisterBody = z.infer<typeof AdminRegisterBody>;

export const MeReply = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string(),
  emailVerifiedAt: z.number().int().nullable(),
  roles: z.array(z.string()),
});
export type MeReply = z.infer<typeof MeReply>;

export const LoginReply = MeReply.extend({
  sessionToken: z.string(),
  expiresAt: z.number().int(),
});
export type LoginReply = z.infer<typeof LoginReply>;

export const OkReply = z.object({ ok: z.literal(true) });
