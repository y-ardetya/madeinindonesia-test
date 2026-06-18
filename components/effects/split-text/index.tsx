'use client'

import { useGSAP } from '@gsap/react'
import cn from 'clsx'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText as GSAPSplitText } from 'gsap/SplitText'
import { useRef } from 'react'
import s from './split-text.module.css'

gsap.registerPlugin(GSAPSplitText, ScrollTrigger, useGSAP)

type SplitTextProps = {
  children: string
  type?: ('lines' | 'words' | 'chars')[]
  as?: keyof React.JSX.IntrinsicElements
  className?: string
  stagger?: number
  duration?: number
  delay?: number
  start?: string
  mask?: 'lines' | 'words' | 'chars'
  play?: boolean
}

export function SplitText({
  children,
  type = ['lines'],
  as: Tag = 'div',
  className,
  stagger = 0.05,
  duration = 0.8,
  delay = 0,
  start = 'top 75%',
  mask = 'lines',
  play = true,
}: SplitTextProps) {
  const ref = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const element = ref.current
      if (!(element && play)) return

      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches

      const split = new GSAPSplitText(element, {
        type: type.join(', '),
        mask: mask,
      })

      let targets = split.lines
      if (split.chars.length > 0) {
        targets = split.chars
      } else if (split.words.length > 0) {
        targets = split.words
      }

      if (reduceMotion) {
        gsap.set(targets, { yPercent: 0 })
      } else {
        gsap.from(targets, {
          yPercent: 100,
          duration,
          stagger,
          delay,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: element,
            start,
            once: true,
          },
        })
      }

      return () => split.revert()
    },
    {
      scope: ref,
      dependencies: [
        children,
        type.join(','),
        stagger,
        duration,
        delay,
        start,
        play,
      ],
    }
  )

  const Component = Tag as unknown as React.ComponentType<
    React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> }
  >

  return (
    <Component
      ref={ref}
      className={cn(s.splitText, className, !play && s.hidden)}
    >
      {children}
    </Component>
  )
}
