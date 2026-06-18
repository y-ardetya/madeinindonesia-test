'use client'

import { Wrapper } from '@/components/layout/wrapper'
import { ModelViewer } from '@/components/ui/model-viewer'

export default function HomePage() {
  return (
    <Wrapper theme="light" webgl>
      <ModelViewer />
    </Wrapper>
  )
}
