import { Spline_Sans_Mono } from 'next/font/google'
import localFont from 'next/font/local'

const mono = Spline_Sans_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--next-font-mono',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
})

const script = localFont({
  src: [
    {
      path: '../../public/fonts/tirelessly-love-you.otf',
      style: 'italic',
      weight: '400',
    },
  ],
  variable: '--next-font-script',
})

const display = localFont({
  src: [
    {
      path: '../../public/fonts/coolvetica-compressed.otf',
      style: 'normal',
      weight: '400',
    },
  ],
  variable: '--next-font-display',
})

const serif = localFont({
  src: [
    {
      path: '../../public/fonts/swiss-bt.ttf',
      style: 'normal',
      weight: '400',
    },
  ],
  variable: '--next-font-serif',
})

const fonts = [display, mono, script, serif]
const fontsVariable = fonts.map((font) => font.variable).join(' ')

export { fontsVariable }
