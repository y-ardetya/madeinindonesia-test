import { z } from 'zod'

/**
 * Typed Environment Variables
 *
 * Provides validated, type-safe access to environment variables.
 * Import `env` instead of using `process.env` directly for type safety.
 *
 * @example
 * ```ts
 * import { env } from '@/lib/env'
 *
 * // Type-safe access with IntelliSense
 * const url = env.NEXT_PUBLIC_BASE_URL // string | undefined
 * const projectId = env.NEXT_PUBLIC_SANITY_PROJECT_ID // string | undefined
 * ```
 */

const envSchema = z.object({
  // Core
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  NEXT_PUBLIC_BASE_URL: z.url().optional(),

  // Analytics
  NEXT_PUBLIC_GOOGLE_ANALYTICS: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID: z.string().optional(),
  NEXT_PUBLIC_FACEBOOK_APP_ID: z.string().optional(),
})

type Env = z.infer<typeof envSchema>

/**
 * Validated environment variables with full TypeScript IntelliSense.
 *
 * All fields are optional -- integrations check their own requirements
 * via the registry's `isConfigured()`. This object provides type-safe access
 * without runtime validation overhead (parsing happens once at import).
 */
export const env: Env = envSchema.parse(process.env)

/**
 * Canonical base URL for the application.
 *
 * Falls back to `https://localhost:3000` for local development (the dev server
 * supports --https mode). In production, NEXT_PUBLIC_BASE_URL must be set —
 * omitting it causes all canonical URLs, sitemaps, and OG images to resolve
 * to localhost, breaking SEO entirely.
 */
export const APP_BASE_URL = env.NEXT_PUBLIC_BASE_URL ?? 'https://localhost:3000'

if (
  process.env.NODE_ENV === 'production' &&
  !process.env.NEXT_PUBLIC_BASE_URL
) {
  console.warn(
    '[env] NEXT_PUBLIC_BASE_URL is not set in production. ' +
      'Canonical URLs, sitemaps, and OG image paths will resolve to localhost, ' +
      'which harms SEO. Set NEXT_PUBLIC_BASE_URL to your production domain.'
  )
}
