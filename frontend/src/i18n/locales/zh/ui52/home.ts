// 52code UI 文案：home（zh）。由对应负责人维护，新增 key 必须中英文同步。
export default {
  nav: {
    label: '主导航',
    access: '接入方式',
    routing: '请求路由',
    capabilities: '调度能力',
    openMenu: '打开菜单',
    closeMenu: '关闭菜单',
    home: '返回首页'
  },
  hero: {
    kicker: 'CODING AI GATEWAY',
    kickerLove: '我爱 CODE',
    titleLine1: '为写代码的人，',
    titleLine2: '接通每一个大模型。',
    description:
      'Claude Code、Codex CLI、Gemini CLI 和各类 SDK 共用一个接入地址。请求在多账号池中调度，遇到限流或异常自动换号重试；按实际用量计费，每一笔都有记录。',
    ctaStart: '开始使用',
    ctaConsole: '进入控制台',
    ctaPricing: '查看模型价格',
    ctaDocs: '阅读文档'
  },
  access: {
    protocolLabel: '选择接入协议',
    baseUrl: 'BASE_URL',
    copy: '复制',
    copied: '已复制',
    copyLabel: '复制接入地址',
    copySuccess: '接入地址已复制',
    protocols: {
      openai: 'OpenAI 兼容',
      anthropic: 'Anthropic 原生',
      gemini: 'Gemini 原生'
    },
    hints: {
      openai: '适用于 OpenAI SDK、Cursor、Codex CLI 等兼容客户端',
      anthropic: '适用于 Claude Code 与 Anthropic SDK，客户端会自动拼接 /v1/messages',
      gemini: '适用于 Gemini CLI 与 Google GenAI SDK'
    }
  },
  routing: {
    title: '请求路由',
    demoBadge: '示意 · Demo',
    ariaLabel: '请求路由示意图：客户端经由网关鉴权、调度、计费后转发到上游模型服务商',
    chips: {
      stream: 'SSE 流式',
      retry: '自动重试',
      billing: '按量计费'
    },
    hubCaption: '鉴权 · 调度 · 计费',
    pool: '账号池',
    clientsLabel: '客户端',
    upstreamsLabel: '上游',
    logLabel: '示意请求流水',
    retried: '已换号重试',
    demoNote: '以上为示意动画，不代表实时流量'
  },
  quickstart: {
    kicker: '接入方式',
    title: '三步接入，不改业务代码。',
    description: '不需要新的 SDK，也不用改业务逻辑。把右侧配置复制到你的环境里即可。',
    steps: {
      register: {
        titleOpen: '注册并充值',
        titleClosed: '获取账号并充值',
        desc: '{account}{funding}',
        accountOpen: '注册账号后，',
        accountClosed: '当前未开放注册，请联系管理员获取账号；',
        fundingTopup: '可在线充值或使用兑换码，余额按实际用量扣减。',
        fundingSubscription: '可在线购买订阅套餐或使用兑换码。',
        fundingRedeem: '使用兑换码为账户充值，余额按实际用量扣减。'
      },
      key: {
        title: '创建 API 密钥',
        desc: '每个密钥绑定一个分组，可设置额度、有效期、限速与 IP 白名单。'
      },
      baseUrl: {
        title: '替换 Base URL',
        desc: '把客户端的接口地址指向本站，填入密钥即可调用。'
      }
    },
    terminal: {
      label: '接入示例',
      copy: '复制',
      copied: '已复制',
      copyLabel: '复制示例代码',
      copySuccess: '示例代码已复制',
      files: {
        claude: '~/.zshrc 或当前终端',
        codex: '~/.codex/config.toml',
        python: 'main.py',
        curl: 'terminal'
      },
      keyPlaceholder: 'sk-你的密钥',
      claudeComment: '写入 ~/.zshrc，或直接在当前终端执行',
      codexComment: '~/.codex/config.toml',
      codexEnvComment: '然后在终端设置密钥并启动',
      pythonPrompt: '你好'
    }
  },
  capabilities: {
    kicker: '调度能力',
    title: '你只管写代码，线路交给调度器。',
    description:
      '上游账号会限流、会过期，也会偶发抖动。调度器持续跟踪账号状态，为每次请求挑选当下可用的线路，失败时自动切换。',
    pool: {
      title: '多账号池调度',
      desc: '同一分组下的多个上游账号共同承载请求，按负载与可用状态分配；支持会话粘性，减少缓存失效。',
      caption: '#4 负载最低 → 选中'
    },
    failover: {
      title: '限流自动换号',
      desc: '上游返回 429 或 5xx 时，请求立即在同组其他账号上重试，客户端无感知。',
      cooling: '#3 冷却中，到期自动恢复'
    },
    limits: {
      title: '密钥额度与限速',
      desc: '每个密钥可单独设置总额度、有效期，以及 5 小时 / 1 天 / 7 天的消费上限和 IP 白名单。'
    },
    protocols: {
      title: '原生协议透传',
      desc: 'Anthropic、OpenAI、Gemini 三套接口原样支持，流式响应、工具调用与多模态输入照常可用。'
    },
    cache: {
      title: '缓存单独计价',
      desc: '输入、输出、缓存写入与缓存读取分别计价。长对话与 Claude Code 这类反复携带上下文的场景，缓存部分更省。',
      input: '输入',
      output: '输出',
      cacheWrite: '缓存写入',
      cacheRead: '缓存读取'
    },
    ledger: {
      title: '每笔可对账',
      desc: '每次请求都记录模型、Token、耗时与费用，在「使用记录」里逐笔可查。'
    }
  },
  cta: {
    title: '现在开始',
    description: '注册、创建密钥、替换地址，几分钟就能跑通第一个请求。',
    descriptionClosed: '登录控制台、创建密钥、替换地址，几分钟就能跑通第一个请求。',
    primary: '开始使用',
    console: '进入控制台',
    secondary: '模型广场',
    docs: '阅读文档'
  },
  footer: {
    label: '页脚导航',
    console: '控制台',
    login: '登录',
    poweredBy: '基于开源项目 Sub2API 构建',
    rights: '保留所有权利。'
  }
}
