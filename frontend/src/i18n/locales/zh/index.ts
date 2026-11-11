import adminAccessKeys from './adminAccessKeys'
import mcp from './mcp'
import supportTickets from './supportTickets'
import landing from './landing'
import common from './common'
import dashboard from './dashboard'
import channelMonitorV2 from './channelMonitorV2'
import batchImage from './batchImage'
import admin from './admin'
import misc from './misc'
import ui52 from './ui52'

export default {
  adminAccessKeys,
  mcp,
  supportTickets,
  ...landing,
  ...common,
  ...dashboard,
  ...channelMonitorV2,
  ...batchImage,
  admin,
  ...misc,
  ui52,
}
