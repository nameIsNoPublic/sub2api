package handler

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	middleware2 "github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestSupportTicketUploadConcurrency(t *testing.T) {
	h := NewSupportTicketHandler(nil)
	router := gin.New()
	const path = "/api/v1/support-tickets"
	entered := make(chan struct{}, 2)
	done := make(chan struct{})
	defer close(done)
	router.POST(path, func(c *gin.Context) {
		id, _ := strconv.ParseInt(c.GetHeader("X-Test-Actor"), 10, 64)
		c.Set(string(middleware2.ContextKeyUser), middleware2.AuthSubject{UserID: id})
	}, h.limitImageUploads, func(c *gin.Context) {
		if c.GetHeader("X-Test-Hold") == "yes" {
			entered <- struct{}{}
			<-done
		}
		c.Status(http.StatusNoContent)
	})
	perform := func(actor, contentType string, hold bool) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPost, path, nil)
		req.Header.Set("Content-Type", contentType)
		req.Header.Set("X-Test-Actor", actor)
		if hold {
			req.Header.Set("X-Test-Hold", "yes")
		}
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		return rec
	}
	const multipart = "multipart/form-data; boundary=ticket"
	go perform("1", multipart, true)
	<-entered
	blocked := perform("1", multipart, false)
	require.Equal(t, http.StatusTooManyRequests, blocked.Code)
	require.Equal(t, "5", blocked.Header().Get("Retry-After"))

	go perform("2", multipart, true)
	<-entered
	require.Equal(t, http.StatusTooManyRequests, perform("3", multipart, false).Code)
	require.Equal(t, http.StatusNoContent, perform("3", "application/json", false).Code)
}
