import { z } from "zod";
import { ROLES } from "../../shared/constants/roles.js";

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum([ROLES.SUPER_ADMIN, ROLES.SITE_ADMIN, ROLES.OPERATOR, ROLES.CLIENT_ADMIN, ROLES.CLIENT_USER])
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum([ROLES.CLIENT_ADMIN, ROLES.CLIENT_USER])
});
