// 52code UI 文案：home（en）。由对应负责人维护，新增 key 必须中英文同步。
export default {
  nav: {
    label: 'Main navigation',
    access: 'Quickstart',
    routing: 'Routing',
    capabilities: 'Scheduler',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    home: 'Back to home'
  },
  hero: {
    kicker: 'CODING AI GATEWAY',
    kickerLove: '52 = I LOVE CODE',
    titleLine1: 'Made for people who code.',
    titleLine2: 'Wired to every model.',
    description:
      'Claude Code, Codex CLI, Gemini CLI and your SDKs share one endpoint. Requests are scheduled across a pool of accounts and retried on another account when one is rate-limited or failing. You pay for what you use, and every call is on the record.',
    ctaStart: 'Get started',
    ctaConsole: 'Open console',
    ctaPricing: 'View model pricing',
    ctaDocs: 'Read the docs'
  },
  access: {
    protocolLabel: 'Choose an API protocol',
    baseUrl: 'BASE_URL',
    copy: 'Copy',
    copied: 'Copied',
    copyLabel: 'Copy the base URL',
    copySuccess: 'Base URL copied',
    protocols: {
      openai: 'OpenAI-compatible',
      anthropic: 'Anthropic native',
      gemini: 'Gemini native'
    },
    hints: {
      openai: 'For the OpenAI SDK, Cursor, Codex CLI and other compatible clients',
      anthropic: 'For Claude Code and the Anthropic SDK. The client appends /v1/messages itself',
      gemini: 'For Gemini CLI and the Google GenAI SDK'
    }
  },
  routing: {
    title: 'Request routing',
    demoBadge: 'Illustration · Demo',
    ariaLabel: 'Routing diagram: clients pass through the gateway for auth, scheduling and billing, then reach upstream model providers',
    chips: {
      stream: 'SSE streaming',
      retry: 'Auto retry',
      billing: 'Usage billing'
    },
    hubCaption: 'auth · route · bill',
    pool: 'Account pool',
    clientsLabel: 'Clients',
    upstreamsLabel: 'Upstreams',
    logLabel: 'Sample request log',
    retried: 'retried on another account',
    demoNote: 'Animated illustration, not live traffic'
  },
  quickstart: {
    kicker: 'Quickstart',
    title: 'Three steps. No code rewrites.',
    description: 'No new SDK and no changes to your business logic. Copy the config on the right into your environment and go.',
    steps: {
      register: {
        titleOpen: 'Sign up and top up',
        titleClosed: 'Get an account and top up',
        desc: '{account} {funding}',
        accountOpen: 'Create an account.',
        accountClosed: 'Registration is closed right now, so ask the site admin for an account.',
        fundingTopup: 'Then top up online or redeem a code. Your balance is charged by actual usage.',
        fundingSubscription: 'Then buy a subscription plan online or redeem a code.',
        fundingRedeem: 'Then add credit with a redeem code. Your balance is charged by actual usage.'
      },
      key: {
        title: 'Create an API key',
        desc: 'Each key is bound to a group and can carry its own quota, expiry, rate limits and IP allowlist.'
      },
      baseUrl: {
        title: 'Swap the base URL',
        desc: 'Point your client at this site, paste in the key, and you are live.'
      }
    },
    terminal: {
      label: 'Integration examples',
      copy: 'Copy',
      copied: 'Copied',
      copyLabel: 'Copy example code',
      copySuccess: 'Example copied',
      files: {
        claude: '~/.zshrc or current shell',
        codex: '~/.codex/config.toml',
        python: 'main.py',
        curl: 'terminal'
      },
      keyPlaceholder: 'sk-your-key',
      claudeComment: 'Add to ~/.zshrc, or run in your current shell',
      codexComment: '~/.codex/config.toml',
      codexEnvComment: 'Then set the key in your shell and launch',
      pythonPrompt: 'Hello'
    }
  },
  capabilities: {
    kicker: 'Scheduler',
    title: 'You write the code. The scheduler handles the wiring.',
    description:
      'Upstream accounts get rate-limited, expire and occasionally wobble. The scheduler keeps track of every account and sends each request down a line that works right now, switching automatically when one fails.',
    pool: {
      title: 'Account pool scheduling',
      desc: 'Multiple upstream accounts in a group share the load, assigned by utilization and availability. Sticky sessions keep prompt caches warm.',
      caption: '#4 least loaded → picked'
    },
    failover: {
      title: 'Failover on rate limits',
      desc: 'When an upstream returns 429 or 5xx, the request is retried right away on another account in the same group. Your client never notices.',
      cooling: '#3 cooling down, back automatically'
    },
    limits: {
      title: 'Per-key quotas and limits',
      desc: 'Give every key its own quota, expiry, 5-hour / 1-day / 7-day spend caps and an IP allowlist.'
    },
    protocols: {
      title: 'Native protocol passthrough',
      desc: 'Anthropic, OpenAI and Gemini APIs work as-is, with streaming, tool calls and multimodal input intact.'
    },
    cache: {
      title: 'Cache priced separately',
      desc: 'Input, output, cache writes and cache reads are billed separately. Long chats and Claude Code sessions that resend context save the most.',
      input: 'Input',
      output: 'Output',
      cacheWrite: 'Cache write',
      cacheRead: 'Cache read'
    },
    ledger: {
      title: 'Every call on the ledger',
      desc: 'Each request records the model, tokens, latency and cost, all browsable line by line in Usage.'
    }
  },
  cta: {
    title: 'Start now',
    description: 'Sign up, create a key, swap the URL. Your first request can be running in minutes.',
    descriptionClosed: 'Sign in, create a key, swap the URL. Your first request can be running in minutes.',
    primary: 'Get started',
    console: 'Open console',
    secondary: 'Model plaza',
    docs: 'Read the docs'
  },
  footer: {
    label: 'Footer navigation',
    console: 'Console',
    login: 'Sign in',
    poweredBy: 'Built on the open-source Sub2API',
    rights: 'All rights reserved.'
  }
}
