import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: import.meta.env.VITE_BLINK_PROJECT_ID || 'orbit-crm-launchpad-aubtbpnf',
  publishableKey: import.meta.env.VITE_BLINK_PUBLISHABLE_KEY || 'blnk_pk_z6yqLi0tUyRfpCUx08jema90wLQtOXS0',
  authRequired: false,
  auth: { mode: 'managed' },
})
