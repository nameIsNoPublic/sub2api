// 52code UI 文案：auth（en）。由对应负责人维护，新增 key 必须中英文同步。
export default {
  backHome: 'Back to home',
  switchToLight: 'Switch to light mode',
  switchToDark: 'Switch to dark mode',
  homeLabel: 'Go to {name} home',
  rights: 'All rights reserved',
  visual: {
    label: 'About {name}',
    titleLine1: 'One base URL,',
    titleLine2: 'every coding model you use.',
    description:
      'Claude Code, Codex CLI, Gemini CLI and OpenAI-compatible clients share a single endpoint. Pay for what you use, and trace every request.',
    terminalTitle: 'terminal',
    terminalComment: '# add to ~/.zshrc or your current shell',
    tokenPlaceholder: 'sk-your-key',
    points: {
      protocol: {
        title: 'Native protocols',
        desc: 'OpenAI, Anthropic and Gemini APIs pass through as-is. No client changes.'
      },
      routing: {
        title: 'Health-aware routing',
        desc: 'Traffic follows account health and fails over automatically on rate limits.'
      },
      billing: {
        title: 'Transparent billing',
        desc: 'Charged by actual usage, with every request in your usage log.'
      }
    }
  },
  showPassword: 'Show password',
  showConfirmPassword: 'Show confirm password'
}
