import { z } from 'zod'

export const coreEnvSchema = z.object({
  NEXT_PUBLIC_BASE_URL: z.string().url().optional(),
})
