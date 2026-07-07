import { createFileRoute } from '@tanstack/react-router'
import PortalStyleGuide from '@/pages/portal/PortalStyleGuide'

export const Route = createFileRoute('/_authenticated/_portal/me/style-guide')({
    component: PortalStyleGuide,
})
