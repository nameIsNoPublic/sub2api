// 52code UI 文案：dashboard（en）。由对应负责人维护，新增 key 必须中英文同步。
export default {
  metricCost: 'Cost',
  metricTokens: 'Tokens',
  viewBars: 'Bar view',
  viewDonut: 'Donut view',
  otherModels: '{count} other models',
  showAllModels: 'Show all {count} models',
  collapseModels: 'Collapse',
  requestsCount: '{count} req',
  total: 'Total',
  colTime: 'Time',
  colCost: 'Actual / Std',
  endpoint: 'Endpoint',
  endpointHint: 'Base URL differs by client. Click a row to copy:',
  copyEndpoint: 'Copy root URL',
  copyClientUrl: 'Copy the {client} Base URL',
  clientOpenAI: 'OpenAI-compatible / Codex',
  clientClaude: 'Claude Code / Gemini CLI',
  clientGemini: 'Gemini API',
  rootOnly: 'root',
  hero: {
    accountBalance: 'Account balance',
    overview: 'Account overview',
    hideBalance: 'Hide balance',
    showBalance: 'Show balance',
    spend7d: '7-day spend',
    savings: 'Total saved',
    savedPct: '{percent}% off',
    avg7d: '7-day avg',
    runway: 'Est. runway',
    days: '{days} days',
    recharge: 'Top up',
    useLogs: 'Usage logs'
  },
  metrics: {
    keysUnit: 'keys',
    requestsUnit: 'req',
    manage: 'Manage',
    cacheShare: 'Cache {percent}%'
  },
  channelStatus: {
    retry: 'Retry',
    allHealthy: 'All systems operational',
    healthy: 'Operational',
    warning: 'Degraded',
    critical: 'Incident',
    unknown: 'No data',
    loadFailed: 'Unavailable',
    empty: 'No channel monitors configured',
    details: 'View channel details',
    availability7d: '7-day availability',
    success24h: '24-hour success rate',
    recentBuckets: 'Last 32 intervals',
    stale: 'Refresh failed. Showing previous status.'
  },
  quickConnect: {
    steps: '3 steps',
    categoryLabel: 'Connection type',
    clientLabel: 'Client',
    categories: {
      editor: 'Coding',
      sdk: 'SDK / API',
      client: 'Clients',
      image: 'Images'
    },
    openaiHint: 'OpenAI-compatible clients use the /v1 URL',
    clientFields:
      'Enter this URL and key in the client’s OpenAI-compatible settings',
    modelHint:
      'Replace YOUR_MODEL / YOUR_IMAGE_MODEL with a model available to the key’s group.',
    faqTitle: 'Troubleshooting',
    faq: '401 Invalid or disabled key · 403 Model access denied · 429 Rate limited',
    title: 'Quick connect',
    hint: 'Pick a client → pick a key → copy the config and paste it',
    baseUrl: 'Base URL',
    apiKey: 'API key',
    newKey: 'New',
    copyKey: 'Copy key',
    copyConfig: 'Copy config',
    copyBaseUrl: 'Copy Base URL',
    copied: 'Copied',
    noKeys: 'No active keys yet — create one first',
    keysLoadFailed: 'Failed to load keys, try again later',
    secretNote:
      'The copied config contains your full key. Do not share it publicly.',
    codexNote:
      'Codex CLI also needs ~/.codex/config.toml. Generate the full config with the usage wizard on the keys page.',
    codexSnippetNote:
      'Core ~/.codex/config.toml fields below; generate the full file with the usage wizard on the keys page',
    openWizard: 'Open usage wizard',
    claudeHint: 'Claude Code uses the root URL (without /v1)',
    codexHint: 'Codex Base URL requires the /v1 suffix',
    geminiHint:
      'Gemini CLI uses the root URL; the CLI appends the version path',
    runAfter: 'Start {client} after exporting the variables'
  }
}
