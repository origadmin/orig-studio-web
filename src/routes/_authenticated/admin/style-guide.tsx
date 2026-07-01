import { createFileRoute } from '@tanstack/react-router'
import StyleGuidePage from '@/pages/admin/StyleGuide'

export const Route = createFileRoute('/_authenticated/admin/style-guide')({
  component: StyleGuidePage,
})
