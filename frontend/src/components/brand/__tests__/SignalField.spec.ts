import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import SignalField from '../SignalField.vue'

interface SignalFieldStats {
  width: number
  height: number
  cell: number
  levels: number
  contours: number
  points: number
  buildMs: number
  particles: number
  builds: number
}

/** 记录调用次数的 2D 上下文替身：任意方法都是空操作，属性可读写 */
function createMockContext() {
  const calls: Record<string, number> = {}
  const strokeStyles: string[] = []
  /** 每次 clearRect 的面积（CSS 像素） */
  const clears: number[] = []
  const gradient = { addColorStop: () => undefined }
  const target: Record<string | symbol, unknown> = {}
  const ctx = new Proxy(target, {
    get(obj, prop) {
      if (prop in obj) return obj[prop]
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => gradient
      }
      if (typeof prop !== 'string') return undefined
      return (...args: number[]) => {
        calls[prop] = (calls[prop] || 0) + 1
        if (prop === 'clearRect') clears.push(args[2] * args[3])
      }
    },
    set(obj, prop, value) {
      if (prop === 'strokeStyle') strokeStyles.push(String(value))
      obj[prop] = value
      return true
    }
  })
  return { ctx, calls, strokeStyles, clears }
}

function stubSize(width: number, height: number) {
  return vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => ({})
  } as DOMRect)
}

/** 允许动画：关闭减少动效偏好、窗口处于聚焦状态 */
function allowMotion() {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }) as unknown as MediaQueryList
  )
  return vi.spyOn(document, 'hasFocus').mockReturnValue(true)
}

/** 接管 requestAnimationFrame，按 60Hz 时间戳手动推进 */
function captureFrames() {
  const callbacks: FrameRequestCallback[] = []
  let ts = 0
  const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    callbacks.push(cb)
    return callbacks.length
  })
  const advance = (frames: number) => {
    for (let i = 0; i < frames; i++) {
      const cb = callbacks.shift()
      if (!cb) break
      ts += 1000 / 60
      cb(ts)
    }
  }
  return { raf, advance }
}

function statsOf(wrapper: ReturnType<typeof mount>): SignalFieldStats {
  return (wrapper.vm as unknown as { stats: SignalFieldStats }).stats
}

describe('SignalField', () => {
  let mock: ReturnType<typeof createMockContext>

  beforeEach(() => {
    mock = createMockContext()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => mock.ctx as unknown as CanvasRenderingContext2D
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    document.documentElement.classList.remove('dark')
  })

  it('renders a decorative, non-interactive root', () => {
    stubSize(800, 500)
    const wrapper = mount(SignalField, { attrs: { class: 'opacity-80' } })
    const root = wrapper.get('.signal-field')
    expect(root.attributes('aria-hidden')).toBe('true')
    expect(root.classes()).toContain('opacity-80')
    expect(wrapper.findAll('canvas')).toHaveLength(2)
    wrapper.unmount()
  })

  it('skips canvas work when the element has no size', () => {
    stubSize(0, 0)
    const getContext = HTMLCanvasElement.prototype.getContext as unknown as ReturnType<typeof vi.fn>
    const wrapper = mount(SignalField, { props: { variant: 'hero' } })
    expect(getContext).not.toHaveBeenCalled()
    expect(statsOf(wrapper).contours).toBe(0)
    wrapper.unmount()
  })

  it('falls back to a static dot grid when canvas is unavailable', async () => {
    stubSize(800, 500)
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null)
    const wrapper = mount(SignalField, { props: { variant: 'hero' } })
    await flushPromises()
    expect(wrapper.findAll('canvas')).toHaveLength(0)
    expect(wrapper.find('.bg-dot-grid').exists()).toBe(true)
    wrapper.unmount()
  })

  it('builds a hero contour field at 1440x900 within budget', () => {
    stubSize(1440, 900)
    const wrapper = mount(SignalField, { props: { variant: 'hero' } })
    const stats = statsOf(wrapper)
    expect(stats.width).toBe(1440)
    expect(stats.height).toBe(900)
    expect(stats.levels).toBe(14)
    expect(stats.cell).toBe(14)
    expect(stats.contours).toBeGreaterThan(20)
    // 目标 < 40ms；测试环境放宽，避免 CI 抖动误报
    expect(stats.buildMs).toBeLessThan(200)
    // 每个等值层一次 stroke，加若干光点尾迹
    expect(mock.calls.stroke).toBeGreaterThanOrEqual(stats.levels)
    expect(mock.calls.quadraticCurveTo).toBeGreaterThan(100)
    wrapper.unmount()
  })

  it('is deterministic for the same seed', () => {
    stubSize(1200, 700)
    const a = mount(SignalField, { props: { variant: 'hero', seed: 7 } })
    const b = mount(SignalField, { props: { variant: 'hero', seed: 7 } })
    const c = mount(SignalField, { props: { variant: 'hero', seed: 8 } })
    expect(statsOf(a).points).toBe(statsOf(b).points)
    expect(statsOf(a).contours).toBe(statsOf(b).contours)
    expect(statsOf(a).points).not.toBe(statsOf(c).points)
    a.unmount()
    b.unmount()
    c.unmount()
  })

  it('enables particles for hero by default and not for ambient', () => {
    stubSize(1440, 900)
    const hero = mount(SignalField, { props: { variant: 'hero' } })
    const ambient = mount(SignalField)
    const ambientWithSparks = mount(SignalField, { props: { particles: true } })
    const heroWithout = mount(SignalField, { props: { variant: 'hero', particles: false } })
    expect(statsOf(hero).particles).toBe(5)
    expect(statsOf(ambient).levels).toBe(11)
    expect(statsOf(ambient).particles).toBe(0)
    expect(statsOf(ambientWithSparks).particles).toBe(3)
    expect(statsOf(heroWithout).particles).toBe(0)
    hero.unmount()
    ambient.unmount()
    ambientWithSparks.unmount()
    heroWithout.unmount()
  })

  it('uses dark line colors inside a .dark container even on a light page', () => {
    stubSize(900, 600)
    const panel = document.createElement('div')
    panel.className = 'dark'
    document.body.appendChild(panel)
    const wrapper = mount(SignalField, { props: { variant: 'hero' }, attachTo: panel })
    // 深色低层线色为白色，浅色模式为墨色 (23, 24, 28)
    expect(mock.strokeStyles.some((s) => s.startsWith('rgba(255, 255, 255'))).toBe(true)
    expect(mock.strokeStyles.some((s) => s.startsWith('rgba(23, 24, 28'))).toBe(false)
    wrapper.unmount()
    panel.remove()
  })

  it('redraws the static layer when the dark class toggles', async () => {
    stubSize(900, 600)
    const host = document.createElement('div')
    document.body.appendChild(host)
    const wrapper = mount(SignalField, { props: { variant: 'hero' }, attachTo: host })
    const before = mock.calls.stroke
    document.documentElement.classList.add('dark')
    await flushPromises()
    expect(mock.calls.stroke).toBeGreaterThan(before)
    const afterDark = mock.calls.stroke
    // 与主题无关的 class 变化不触发重绘
    document.documentElement.classList.add('unrelated-class')
    await flushPromises()
    expect(mock.calls.stroke).toBe(afterDark)
    document.documentElement.classList.remove('unrelated-class')
    wrapper.unmount()
    host.remove()
  })

  it('runs the spark loop when motion is allowed and cleans up on unmount', () => {
    stubSize(1440, 900)
    allowMotion()
    const { raf, advance } = captureFrames()
    const caf = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
    const disconnects: string[] = []
    class TrackingObserver {
      constructor(private readonly name: string) {}
      observe() {}
      unobserve() {}
      disconnect() {
        disconnects.push(this.name)
      }
    }
    vi.stubGlobal(
      'ResizeObserver',
      class extends TrackingObserver {
        constructor() {
          super('resize')
        }
      }
    )
    vi.stubGlobal(
      'IntersectionObserver',
      class extends TrackingObserver {
        constructor() {
          super('intersection')
        }
      }
    )
    const mutationDisconnect = vi.spyOn(MutationObserver.prototype, 'disconnect')

    const wrapper = mount(SignalField, { props: { variant: 'hero' } })
    expect(raf).toHaveBeenCalled()
    const drawsBefore = mock.calls.drawImage || 0
    advance(120)
    expect(mock.calls.drawImage || 0).toBeGreaterThan(drawsBefore)

    wrapper.unmount()
    expect(caf).toHaveBeenCalled()
    expect(disconnects).toEqual(expect.arrayContaining(['resize', 'intersection']))
    expect(mutationDisconnect).toHaveBeenCalled()
  })

  it('clears only dirty rects on animation frames', () => {
    stubSize(1440, 900)
    allowMotion()
    const { advance } = captureFrames()
    const wrapper = mount(SignalField, { props: { variant: 'hero' } })
    // 跑够时间让光点完成淡入，再统计稳定状态下每帧擦除面积
    advance(240)
    mock.clears.length = 0
    const framesBefore = mock.calls.setTransform || 0
    advance(120)
    const frames = (mock.calls.setTransform || 0) - framesBefore
    const perFrame = mock.clears.reduce((sum, a) => sum + a, 0) / frames
    expect(frames).toBeGreaterThan(0)
    // 整幅为 1440×900；脏矩形擦除应低于其 1/10
    expect(perFrame).toBeLessThan((1440 * 900) / 10)
    wrapper.unmount()
  })

  it('caps the spark layer at 30fps and drops to 15fps while typing', () => {
    stubSize(1440, 900)
    allowMotion()
    const { advance } = captureFrames()
    const wrapper = mount(SignalField, { props: { variant: 'hero' } })
    advance(2)
    const countFrames = (callbacks: number) => {
      const before = mock.calls.setTransform || 0
      advance(callbacks)
      return (mock.calls.setTransform || 0) - before
    }
    // 60 次 60Hz 回调 ≈ 1 秒
    expect(countFrames(60)).toBeGreaterThanOrEqual(28)
    expect(countFrames(60)).toBeLessThanOrEqual(31)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    const typingFrames = countFrames(60)
    expect(typingFrames).toBeGreaterThanOrEqual(14)
    expect(typingFrames).toBeLessThanOrEqual(16)
    wrapper.unmount()
  })

  it('pauses on blur and resumes on focus or user interaction', () => {
    stubSize(1440, 900)
    allowMotion()
    const { raf, advance } = captureFrames()
    const caf = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
    const wrapper = mount(SignalField, { props: { variant: 'hero' } })
    expect(raf).toHaveBeenCalled()

    const blurAndDrain = () => {
      window.dispatchEvent(new Event('blur'))
      raf.mockClear()
      advance(5)
      expect(raf).not.toHaveBeenCalled()
    }

    blurAndDrain()
    expect(caf).toHaveBeenCalled()
    window.dispatchEvent(new Event('focus'))
    expect(raf).toHaveBeenCalled()

    blurAndDrain()
    window.dispatchEvent(new Event('pointerdown'))
    expect(raf).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('resumes when the page becomes visible again without a focus event', () => {
    stubSize(1440, 900)
    // 模拟 WebView：切回前台时 hasFocus() 仍为 false，且不再派发 focus
    const hasFocus = allowMotion().mockReturnValue(false)
    const { raf, advance } = captureFrames()
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
    const wrapper = mount(SignalField, { props: { variant: 'hero' } })

    for (const resume of [
      () => document.dispatchEvent(new Event('visibilitychange')),
      () => window.dispatchEvent(new Event('pageshow'))
    ]) {
      window.dispatchEvent(new Event('blur'))
      raf.mockClear()
      advance(5)
      expect(raf).not.toHaveBeenCalled()
      resume()
      expect(raf).toHaveBeenCalled()
      // 下一帧复查后循环继续运行
      advance(10)
      expect(raf.mock.calls.length).toBeGreaterThan(1)
    }
    // 帧循环不再读取 document.hasFocus()
    expect(hasFocus).not.toHaveBeenCalled()

    wrapper.unmount()
    raf.mockClear()
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('focus'))
    expect(raf).not.toHaveBeenCalled()
  })

  it('keeps the terrain when only the height changes slightly', async () => {
    const size = stubSize(390, 760)
    let notifyResize: () => void = () => undefined
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: () => void) {
          notifyResize = cb
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
    const resizeTo = async (width: number, height: number) => {
      size.mockReturnValue({ width, height } as DOMRect)
      notifyResize()
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
    const wrapper = mount(SignalField, { props: { variant: 'hero' } })
    const stats = statsOf(wrapper)
    expect(stats.builds).toBe(1)
    const points = stats.points

    // 地址栏收起 / 展开：仅高度变化 60px，复用地形
    await resizeTo(390, 700)
    expect(stats.builds).toBe(1)
    expect(stats.height).toBe(700)
    expect(stats.points).toBe(points)
    await resizeTo(390, 820)
    expect(stats.builds).toBe(1)

    // 高度大幅变化或宽度变化：重建
    await resizeTo(390, 360)
    expect(stats.builds).toBe(2)
    await resizeTo(420, 360)
    expect(stats.builds).toBe(3)
    wrapper.unmount()
  })
})
