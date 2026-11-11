package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestSupportTicketUploadRateLimits(t *testing.T) {
	defaults := service.DefaultSupportTicketImageSettings()
	supportTicketUserUploadsPerMinute, supportTicketSiteUploadsPerMinute := defaults.UserRPM, defaults.SiteRPM
	allower := &fakePanelAllower{}
	p := &PanelRateLimiter{limiter: allower}
	perform := func(id int64, path, contentType string) *httptest.ResponseRecorder {
		router := gin.New()
		router.POST(path, func(c *gin.Context) {
			c.Set(string(ContextKeyUser), AuthSubject{UserID: id})
		}, p.SupportTicketUpload(), func(c *gin.Context) {
			c.Status(http.StatusNoContent)
		})
		req := httptest.NewRequest(http.MethodPost, path, nil)
		req.Header.Set("Content-Type", contentType)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		return rec
	}
	const createPath = "/api/v1/support-tickets"
	const replyPath = "/api/v1/support-tickets/1/actions"
	const multipart = "multipart/form-data; boundary=ticket"

	for range supportTicketUserUploadsPerMinute {
		require.Equal(t, http.StatusNoContent, perform(1, createPath, multipart).Code)
	}
	blocked := perform(1, replyPath, multipart)
	require.Equal(t, http.StatusTooManyRequests, blocked.Code)
	require.Equal(t, "60", blocked.Header().Get("Retry-After"))
	require.Equal(t, "close", blocked.Header().Get("Connection"))
	require.Equal(t, int64(supportTicketUserUploadsPerMinute), allower.counts["support-ticket:upload:site"])
	require.Equal(t, http.StatusNoContent, perform(1, replyPath, "application/json").Code)

	for i := supportTicketUserUploadsPerMinute; i < supportTicketSiteUploadsPerMinute; i++ {
		require.Equal(t, http.StatusNoContent, perform(int64(i+2), replyPath, multipart).Code)
	}
	require.Equal(t, http.StatusTooManyRequests, perform(100, "/api/v1/admin/support-tickets/1/actions", multipart).Code)

	allower.err = errors.New("Redis unavailable")
	require.Equal(t, http.StatusServiceUnavailable, perform(100, createPath, multipart).Code)
	require.Equal(t, http.StatusNoContent, perform(100, createPath, "application/json").Code)
}

func TestSupportTicketUploadUsesSavedRateSettings(t *testing.T) {
	settings := service.DefaultSupportTicketImageSettings()
	settings.UserRPM = 1
	svc := newPanelRateLimitTestService(t, "")
	require.NoError(t, svc.SetSupportTicketImageSettings(context.Background(), settings))
	p := &PanelRateLimiter{limiter: &fakePanelAllower{}, settingService: svc}
	router := gin.New()
	router.POST("/api/v1/support-tickets", func(c *gin.Context) {
		c.Set(string(ContextKeyUser), AuthSubject{UserID: 1})
	}, p.SupportTicketUpload(), func(c *gin.Context) { c.Status(http.StatusNoContent) })
	perform := func() int {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/support-tickets", nil)
		req.Header.Set("Content-Type", "multipart/form-data; boundary=test")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		return rec.Code
	}
	require.Equal(t, http.StatusNoContent, perform())
	require.Equal(t, http.StatusTooManyRequests, perform())
	settings.UserRPM = 3
	require.NoError(t, svc.SetSupportTicketImageSettings(context.Background(), settings))
	require.Equal(t, http.StatusNoContent, perform())
}
