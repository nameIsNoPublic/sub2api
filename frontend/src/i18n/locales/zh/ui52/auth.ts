// 52code UI 文案：auth（zh）。由对应负责人维护，新增 key 必须中英文同步。
export default {
  backHome: '返回首页',
  switchToLight: '切换到浅色模式',
  switchToDark: '切换到深色模式',
  homeLabel: '返回 {name} 首页',
  rights: '保留所有权利',
  visual: {
    label: '{name} 服务介绍',
    titleLine1: '一个 Base URL，',
    titleLine2: '接入你常用的编码模型。',
    description:
      'Claude Code、Codex CLI、Gemini CLI 与 OpenAI 兼容客户端共用同一个接入地址，按实际用量计费，每一笔请求都可追溯。',
    terminalTitle: '终端',
    terminalComment: '# 写入 ~/.zshrc 或当前终端',
    tokenPlaceholder: 'sk-你的密钥',
    points: {
      protocol: {
        title: '协议原样兼容',
        desc: 'OpenAI、Anthropic、Gemini 接口原样转发，客户端无需改造。'
      },
      routing: {
        title: '健康度调度',
        desc: '按账号健康度分流，遇到限流或故障自动换号重试。'
      },
      billing: {
        title: '透明计费',
        desc: '按实际用量扣费，用量记录逐笔可查。'
      }
    }
  },
  showPassword: '显示密码',
  showConfirmPassword: '显示确认密码'
}
