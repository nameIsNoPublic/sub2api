import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supportTicketsAPI, type TicketSummary } from '@/api/supportTickets'
import { useAuthStore } from './auth'

const POLL_MS = 60 * 1000
const MIN_REFRESH_GAP_MS = 10 * 1000

// Polls ticket summaries for the navigation badges; open ticket pages watch `activity` to pick up changes made elsewhere.
export const useSupportTicketStore = defineStore('supportTickets', () => {
  const mine = ref<TicketSummary>()
  const queue = ref<TicketSummary>()
  let timer: ReturnType<typeof setInterval> | null = null
  let generation = 0
  let lastRefresh = 0

  // A failed poll keeps the previous badge; the next tick retries.
  async function refresh() {
    const auth = useAuthStore()
    if (!auth.isAuthenticated) return
    const current = ++generation
    lastRefresh = Date.now()
    const [user, admin] = await Promise.allSettled([
      supportTicketsAPI(false).summary(),
      auth.isAdmin ? supportTicketsAPI(true).summary() : Promise.resolve(undefined)
    ])
    if (current !== generation) return
    if (user.status === 'fulfilled') mine.value = user.value
    if (admin.status === 'fulfilled') queue.value = admin.value
  }

  // Background tabs skip ticks; refreshIfStale catches up when the tab is shown again.
  function start() {
    if (timer) return
    void refresh()
    timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, POLL_MS)
  }

  function refreshIfStale() {
    if (timer && Date.now() - lastRefresh >= MIN_REFRESH_GAP_MS) void refresh()
  }

  function reset() {
    if (timer) clearInterval(timer)
    timer = null
    generation++
    lastRefresh = 0
    mine.value = undefined
    queue.value = undefined
  }

  return { mine, queue, start, refresh, refreshIfStale, reset }
})
