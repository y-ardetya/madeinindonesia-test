import '@/lib/styles/css/index.css'
import { Analytics } from '@vercel/analytics/next'
import { TransformProvider } from 'hamo'
import type { Metadata, Viewport } from 'next'
import { draftMode } from 'next/headers'
import type { PropsWithChildren } from 'react'
import { ReactTempus } from 'tempus/react'
import { RealViewport } from '@/components/real-viewport'
import { APP_BASE_URL } from '@/lib/env'
import { OptionalFeatures } from '@/lib/features'
import { themes } from '@/lib/styles/colors'
import { fontsVariable } from '@/lib/styles/fonts'
import AppData from '@/package.json'

const APP_NAME = AppData.name
const APP_DEFAULT_TITLE = 'Yohane'
const APP_TITLE_TEMPLATE = '%s - YHN'
const APP_DESCRIPTION = AppData.description

export const metadata: Metadata = {
  metadataBase: new URL(APP_BASE_URL),
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  authors: [{ name: 'yohane', url: 'https://x.com/_Ardetya' }],
}

export const viewport: Viewport = {
  themeColor: themes.dark.primary,
  colorScheme: 'dark',
}

export default async function Layout({ children }: PropsWithChildren) {
  const { isEnabled: isDraftMode } = await draftMode()

  return (
    <html
      lang="en"
      dir="ltr"
      className={fontsVariable}
      data-theme="dark"
      suppressHydrationWarning
    >
      <body>
        <TransformProvider>
          <RealViewport>{children}</RealViewport>
        </TransformProvider>

        <OptionalFeatures />
        <ReactTempus patch={!isDraftMode} />
        <Analytics />
      </body>
    </html>
  )
}
