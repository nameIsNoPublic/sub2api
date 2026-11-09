/**
 * 落地页静态内容与纯函数：接入地址推导、终端代码片段、路由示意数据。
 * 与组件解耦，便于单测；代码片段不走 i18n（避免 vue-i18n 解析 { } @ 等特殊字符），
 * 仅注释与占位密钥由调用方传入已翻译文本。
 */

/** 账户充值方式：在线充值 / 仅在线订阅 / 仅兑换码（支付关闭）。 */
export type HomeFundingMode = 'topup' | 'subscription' | 'redeem'

/** 接入协议：OpenAI 兼容 / Anthropic 原生 / Gemini 原生。 */
export type HomeProtocol = 'openai' | 'anthropic' | 'gemini'

export const HOME_PROTOCOLS: readonly HomeProtocol[] = ['openai', 'anthropic', 'gemini']

/** 各协议拼接在站点根地址后的路径（Anthropic 客户端会自行追加 /v1/messages）。 */
export const PROTOCOL_PATHS: Record<HomeProtocol, string> = {
  openai: '/v1',
  anthropic: '',
  gemini: '/v1beta'
}

/**
 * 从后台配置的 api_base_url 推导站点根地址：去掉末尾斜杠与 /v1、/v1beta 后缀，
 * 避免出现 https://x/v1/v1 这类重复路径。
 */
export function resolveApiRoot(apiBaseUrl: string): string {
  return apiBaseUrl
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/v1(beta)?$/, '')
}

/** 终端代码片段的高亮类别。 */
export type SnippetTokenKind = 'plain' | 'comment' | 'keyword' | 'string' | 'variable' | 'command' | 'prompt'

export interface SnippetToken {
  text: string
  kind: SnippetTokenKind
}

export type SnippetLine = SnippetToken[]

export type SnippetId = 'claude' | 'codex' | 'python' | 'curl'

export const SNIPPET_IDS: readonly SnippetId[] = ['claude', 'codex', 'python', 'curl']

/** 代码片段中需要本地化的文案。 */
export interface SnippetCopy {
  /** 占位密钥，如 sk-你的密钥 */
  keyPlaceholder: string
  claudeComment: string
  codexComment: string
  codexEnvComment: string
  pythonPrompt: string
}

const tk = (text: string, kind: SnippetTokenKind = 'plain'): SnippetToken => ({ text, kind })

/**
 * 生成四种客户端的接入片段。
 * @param apiRoot 站点根地址（不含 /v1）
 * @param siteName 站点名，用于 Codex provider 显示名
 */
export function buildSnippets(apiRoot: string, siteName: string, copy: SnippetCopy): Record<SnippetId, SnippetLine[]> {
  const key = copy.keyPlaceholder
  const safeName = siteName.replace(/["\\]/g, '')

  return {
    claude: [
      [tk(`# ${copy.claudeComment}`, 'comment')],
      [tk('export ', 'keyword'), tk('ANTHROPIC_BASE_URL', 'variable'), tk('='), tk(`"${apiRoot}"`, 'string')],
      [tk('export ', 'keyword'), tk('ANTHROPIC_AUTH_TOKEN', 'variable'), tk('='), tk(`"${key}"`, 'string')],
      [],
      [tk('$ ', 'prompt'), tk('claude', 'command')]
    ],
    codex: [
      [tk(`# ${copy.codexComment}`, 'comment')],
      [tk('model_provider', 'variable'), tk(' = '), tk('"gateway"', 'string')],
      [],
      [tk('[model_providers.gateway]', 'keyword')],
      [tk('name', 'variable'), tk(' = '), tk(`"${safeName}"`, 'string')],
      [tk('base_url', 'variable'), tk(' = '), tk(`"${apiRoot}/v1"`, 'string')],
      [tk('wire_api', 'variable'), tk(' = '), tk('"responses"', 'string')],
      [tk('env_key', 'variable'), tk(' = '), tk('"GATEWAY_API_KEY"', 'string')],
      [],
      [tk(`# ${copy.codexEnvComment}`, 'comment')],
      [tk('$ ', 'prompt'), tk('export ', 'keyword'), tk('GATEWAY_API_KEY', 'variable'), tk('='), tk(`"${key}"`, 'string'), tk(' && '), tk('codex', 'command')]
    ],
    python: [
      [tk('from ', 'keyword'), tk('openai '), tk('import ', 'keyword'), tk('OpenAI', 'command')],
      [],
      [tk('client = '), tk('OpenAI', 'command'), tk('(')],
      [tk('    base_url='), tk(`"${apiRoot}/v1"`, 'string'), tk(',')],
      [tk('    api_key='), tk(`"${key}"`, 'string'), tk(',')],
      [tk(')')],
      [],
      [tk('resp = client.chat.completions.'), tk('create', 'command'), tk('(')],
      [tk('    model='), tk('"gpt-6.1-sol"', 'string'), tk(',')],
      [tk('    messages=[{'), tk('"role"', 'string'), tk(': '), tk('"user"', 'string'), tk(', '), tk('"content"', 'string'), tk(': '), tk(`"${copy.pythonPrompt}"`, 'string'), tk('}],')],
      [tk(')')],
      [tk('print', 'keyword'), tk('(resp.choices[0].message.content)')]
    ],
    curl: [
      [tk('$ ', 'prompt'), tk('curl ', 'command'), tk(`${apiRoot}/v1/messages`, 'string'), tk(' \\')],
      [tk('  -H '), tk(`"x-api-key: ${key}"`, 'string'), tk(' \\')],
      [tk('  -H '), tk('"anthropic-version: 2023-06-01"', 'string'), tk(' \\')],
      [tk('  -H '), tk('"content-type: application/json"', 'string'), tk(' \\')],
      [tk('  -d '), tk(`'{"model": "claude-sonnet-5-5", "max_tokens": 256,`, 'string')],
      [tk(`       "messages": [{"role": "user", "content": "Hello"}]}'`, 'string')]
    ]
  }
}

/** 把代码片段还原为可复制的纯文本。 */
export function snippetToText(lines: SnippetLine[]): string {
  return lines.map((line) => line.map((token) => token.text).join('')).join('\n')
}

/* ------------------------------------------------------------------ */
/* 路由示意（Demo）数据：仅用于视觉演示，界面上必须标注「示意」。       */
/* ------------------------------------------------------------------ */

export interface RouteClient {
  name: string
  endpoint: string
}

export interface RouteUpstream {
  name: string
  /** 账号池示意格数 */
  pool: number
}

export const ROUTE_CLIENTS: readonly RouteClient[] = [
  { name: 'Claude Code', endpoint: '/v1/messages' },
  { name: 'Codex CLI', endpoint: '/v1/responses' },
  { name: 'Cursor', endpoint: '/v1/chat/completions' },
  { name: 'Gemini CLI', endpoint: '/v1beta/models/*' }
]

export const ROUTE_UPSTREAMS: readonly RouteUpstream[] = [
  { name: 'Anthropic', pool: 8 },
  { name: 'OpenAI', pool: 8 },
  { name: 'Google Gemini', pool: 6 },
  { name: 'xAI Grok', pool: 5 }
]

export interface DemoRequest {
  client: number
  upstream: number
  method: 'POST'
  path: string
  model: string
  status: 200 | 429
  /** 美元费用；429 为 0 */
  cost: number
  /** 是否为上一条 429 之后在其他账号上的重试 */
  retry?: boolean
}

/** 循环播放的示意请求序列；429 后紧跟一次同上游的 200，演示自动换号重试。 */
export const DEMO_REQUESTS: readonly DemoRequest[] = [
  { client: 0, upstream: 0, method: 'POST', path: '/v1/messages', model: 'claude-sonnet-5-5', status: 200, cost: 0.0184 },
  { client: 1, upstream: 1, method: 'POST', path: '/v1/responses', model: 'gpt-6.1-sol', status: 200, cost: 0.0062 },
  { client: 2, upstream: 1, method: 'POST', path: '/v1/chat/completions', model: 'gpt-5.6-sol', status: 200, cost: 0.0031 },
  { client: 3, upstream: 2, method: 'POST', path: '/v1beta/models/*', model: 'gemini-3-flash', status: 200, cost: 0.0009 },
  { client: 0, upstream: 0, method: 'POST', path: '/v1/messages', model: 'claude-opus-4-8', status: 429, cost: 0 },
  { client: 0, upstream: 0, method: 'POST', path: '/v1/messages', model: 'claude-opus-4-8', status: 200, cost: 0.0412, retry: true },
  { client: 2, upstream: 3, method: 'POST', path: '/v1/chat/completions', model: 'grok-4.7', status: 200, cost: 0.0027 },
  { client: 1, upstream: 1, method: 'POST', path: '/v1/responses', model: 'gpt-6.1-sol', status: 200, cost: 0.0058 },
  { client: 0, upstream: 0, method: 'POST', path: '/v1/messages', model: 'claude-haiku-5-5', status: 200, cost: 0.0011 }
]

/**
 * 路由图坐标系（viewBox 1000 × 380）。节点以百分比定位，容器保持同宽高比，
 * 因此 SVG 连线与 HTML 节点在任意宽度下都能对齐。
 */
export const ROUTE_VIEWBOX = { width: 1000, height: 380 } as const

/** 节点纵向中心（viewBox 单位）。 */
export const ROUTE_ROWS = [62, 148, 234, 320] as const

/** 客户端节点右边缘 / 上游节点左边缘 / 中枢左右接口的 x 坐标。 */
export const ROUTE_X = { clientEdge: 236, hubIn: 420, hubOut: 580, upstreamEdge: 764 } as const

/** 中枢中心 y。 */
export const ROUTE_HUB_Y = 190

/** 生成从 (x1,y1) 到 (x2,y2) 的水平 S 形贝塞尔曲线。 */
export function curvePath(x1: number, y1: number, x2: number, y2: number): string {
  const mid = (x1 + x2) / 2
  return `M${x1} ${y1} C${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`
}

/** 格式化示意费用：$0.0184 / 429 显示 —。 */
export function formatDemoCost(cost: number): string {
  return cost > 0 ? `$${cost.toFixed(4)}` : '—'
}

/* ------------------------------------------------------------------ */
/* 标题末尾光标：拆出最后一个字符，与光标一起不换行。                   */
/* ------------------------------------------------------------------ */

/** 全角收尾标点：字形偏左下，右侧约留半个字宽的空白。 */
const FULL_WIDTH_TRAILING = /[。，、！？：；．]$/u
const CJK_CHAR = /[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/u

export interface CaretTail {
  /** 除最后一个字符外的文本 */
  head: string
  /** 最后一个字符（与光标同处一个不换行片段） */
  tail: string
  /** 是否含中日文字符：光标需下沉到汉字字面底部 */
  cjk: boolean
  /** 是否以全角标点结尾：光标需回收标点右侧留白 */
  fullWidthEnd: boolean
}

export function splitCaretTail(text: string): CaretTail {
  const chars = Array.from(text)
  const tail = chars.pop() ?? ''
  return {
    head: chars.join(''),
    tail,
    cjk: CJK_CHAR.test(text),
    fullWidthEnd: FULL_WIDTH_TRAILING.test(text)
  }
}
