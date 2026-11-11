package middleware

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

const (
	SupportTicketUploadReadTimeout = 60 * time.Second
)

// IsSupportTicketUpload matches only attachment writes for the upload-specific read deadline.
func IsSupportTicketUpload(r *http.Request) bool {
	if r.Method != http.MethodPost {
		return false
	}
	const userPath = "/api/v1/support-tickets"
	const adminPath = "/api/v1/admin/support-tickets"
	path := r.URL.Path
	if path != userPath && !(strings.HasSuffix(path, "/actions") &&
		(strings.HasPrefix(path, userPath+"/") || strings.HasPrefix(path, adminPath+"/"))) {
		return false
	}
	return IsSupportTicketMultipart(r)
}

// IsSupportTicketMultipart identifies attachment attempts, including malformed multipart parameters.
func IsSupportTicketMultipart(r *http.Request) bool {
	contentType, _, _ := strings.Cut(r.Header.Get("Content-Type"), ";")
	return strings.EqualFold(strings.TrimSpace(contentType), "multipart/form-data")
}

// SupportTicketUpload limits multipart attempts before the handler reads any image bytes.
func (p *PanelRateLimiter) SupportTicketUpload() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !IsSupportTicketMultipart(c.Request) {
			c.Next()
			return
		}
		subject, ok := GetAuthSubjectFromContext(c)
		if !ok || subject.UserID <= 0 {
			rejectTicketUpload(c)
			response.Unauthorized(c, "User not authenticated")
			return
		}
		if p == nil || p.limiter == nil {
			rejectTicketUpload(c)
			response.ErrorFrom(c, service.ErrSupportTicketUploadUnavailable)
			return
		}

		settings, err := p.settingService.GetSupportTicketImageSettingsCached(c.Request.Context())
		if err != nil {
			rejectTicketUpload(c)
			response.ErrorFrom(c, err)
			return
		}

		// Charge the account before the shared bucket so a single account cannot exhaust it.
		checks := [...]struct {
			key   string
			limit int
		}{
			{"support-ticket:upload:user:" + strconv.FormatInt(subject.UserID, 10), settings.UserRPM},
			{"support-ticket:upload:site", settings.SiteRPM},
		}
		ctx := c.Request.Context()
		for _, check := range checks {
			result, err := p.limiter.Allow(ctx, check.key, check.limit, panelRateLimitWindow)
			if err != nil {
				rejectTicketUpload(c)
				response.ErrorFrom(c, service.ErrSupportTicketUploadUnavailable.WithCause(fmt.Errorf("upload rate check for actor %d: %w", subject.UserID, err)))
				return
			}
			if !result.Allowed {
				rejectTicketUpload(c)
				abortPanelRateLimited(c, result.RetryAfter)
				return
			}
		}
		c.Next()
	}
}

// rejectTicketUpload avoids draining an unread HTTP/1 upload before writing the rejection.
func rejectTicketUpload(c *gin.Context) {
	if c.Request.ProtoMajor == 1 {
		c.Header("Connection", "close")
	}
	c.Abort()
}
