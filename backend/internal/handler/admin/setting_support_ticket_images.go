package admin

import (
	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

// GetSupportTicketImageSettings returns the persisted attachment protection limits, or their upgrade defaults.
func (h *SettingHandler) GetSupportTicketImageSettings(c *gin.Context) {
	settings, err := h.settingService.GetSupportTicketImageSettings(c.Request.Context())
	if !response.ErrorFrom(c, err) {
		response.Success(c, settings)
	}
}

// UpdateSupportTicketImageSettings validates and replaces the complete attachment protection configuration.
func (h *SettingHandler) UpdateSupportTicketImageSettings(c *gin.Context) {
	var settings service.SupportTicketImageSettings
	if err := c.ShouldBindJSON(&settings); err != nil {
		response.BadRequest(c, "Invalid support ticket image settings")
		return
	}
	if !response.ErrorFrom(c, h.settingService.SetSupportTicketImageSettings(c.Request.Context(), settings)) {
		response.Success(c, settings)
	}
}
