package handler

import (
	"net/http"
	"strconv"
	"sync"

	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	middleware2 "github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

const supportTicketMaxBodyBytes = 128 << 10 // Fits 8,000 supplementary Unicode characters escaped as JSON.

// SupportTicketHandler serves the private user inbox and the administrator queue.
type SupportTicketHandler struct {
	service      *service.SupportTicketService
	uploadSlots  imageConcurrencyLimiter
	uploadActors sync.Map // Authenticated actor IDs with an active image upload.
}

func NewSupportTicketHandler(tickets *service.SupportTicketService) *SupportTicketHandler {
	return &SupportTicketHandler{service: tickets}
}

// Register mounts ticket endpoints under an already authenticated user or admin router group.
func (h *SupportTicketHandler) Register(parent *gin.RouterGroup, admin bool, uploadLimit gin.HandlerFunc) {
	group := parent.Group("/support-tickets", func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		c.Next()
	})
	group.GET("", h.list(admin))
	group.GET("/summary", h.summary(admin))
	group.GET("/:id", h.detail(admin))
	group.GET("/:id/events/:version/images/:position", h.image(admin))
	group.POST("/:id/actions", uploadLimit, h.limitImageUploads, h.act(admin))
	if admin {
		group.PUT("/:id/knowledge", h.setKnowledge)
		group.GET("/knowledge", h.listKnowledge)
	} else {
		group.POST("", uploadLimit, h.limitImageUploads, h.create)
	}
}

func (h *SupportTicketHandler) list(admin bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		actorID, ok := supportTicketActor(c)
		if !ok {
			return
		}
		page, size := response.ParsePagination(c)
		size = min(size, 100)
		items, total, err := h.service.List(c.Request.Context(), supportTicketOwner(actorID, admin),
			c.Query("status"), size, (page-1)*size)
		if !response.ErrorFrom(c, err) {
			response.Paginated(c, items, total, page, size)
		}
	}
}

// summary is polled by the panel for the navigation badge.
func (h *SupportTicketHandler) summary(admin bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		actorID, ok := supportTicketActor(c)
		if !ok {
			return
		}
		item, err := h.service.Summary(c.Request.Context(), supportTicketOwner(actorID, admin))
		if !response.ErrorFrom(c, err) {
			response.Success(c, item)
		}
	}
}

func (h *SupportTicketHandler) detail(admin bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, actorID, ok := supportTicketRequest(c)
		if !ok {
			return
		}
		before, ok := supportTicketCursor(c, "before")
		if !ok {
			return
		}
		item, err := h.service.Detail(c.Request.Context(), id, supportTicketOwner(actorID, admin), before)
		if !response.ErrorFrom(c, err) {
			response.Success(c, item)
		}
	}
}

func (h *SupportTicketHandler) create(c *gin.Context) {
	actorID, ok := supportTicketActor(c)
	if !ok {
		return
	}
	var input service.SupportTicketCreate
	if !bindSupportTicketMessage(c, &input, &input.Images) {
		return
	}
	id, created, err := h.service.Create(c.Request.Context(), actorID, c.GetHeader("Idempotency-Key"), input)
	if response.ErrorFrom(c, err) {
		return
	}
	middleware2.SetAuditExtra(c, map[string]any{"ticket_id": id})
	if !created {
		c.Header("X-Idempotency-Replayed", "true")
	}
	response.Success(c, struct {
		ID int64 `json:"id"`
	}{ID: id})
}

func (h *SupportTicketHandler) act(admin bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, actorID, ok := supportTicketRequest(c)
		if !ok {
			return
		}
		var input service.SupportTicketAction
		if !bindSupportTicketMessage(c, &input, &input.Images) {
			return
		}
		item, err := h.service.Act(c.Request.Context(), id, actorID, admin, input)
		if !response.ErrorFrom(c, err) {
			response.Success(c, item)
		}
	}
}

func (h *SupportTicketHandler) setKnowledge(c *gin.Context) {
	id, actorID, ok := supportTicketRequest(c)
	if !ok {
		return
	}
	var input service.SupportTicketKnowledgeUpdate
	if !bindSupportTicket(c, &input) {
		return
	}
	item, err := h.service.SetKnowledge(c.Request.Context(), id, actorID, input)
	if !response.ErrorFrom(c, err) {
		response.Success(c, item)
	}
}

// listKnowledge exposes only the curated text and its index synchronization fields.
func (h *SupportTicketHandler) listKnowledge(c *gin.Context) {
	if _, ok := supportTicketActor(c); !ok {
		return
	}
	after, ok := supportTicketCursor(c, "after_id")
	if !ok {
		return
	}
	const pageSize = 100
	items, err := h.service.ListKnowledge(c.Request.Context(), after, pageSize+1)
	if response.ErrorFrom(c, err) {
		return
	}
	var next int64
	if len(items) > pageSize {
		items = items[:pageSize]
		next = items[len(items)-1].ID
	}
	response.Success(c, struct {
		Items       []service.SupportTicketKnowledgeItem `json:"items"`
		NextAfterID int64                                `json:"next_after_id,omitempty"`
	}{items, next})
}

func supportTicketActor(c *gin.Context) (int64, bool) {
	subject, ok := middleware2.GetAuthSubjectFromContext(c)
	if !ok || subject.UserID <= 0 {
		response.Unauthorized(c, "User not authenticated")
		return 0, false
	}
	return subject.UserID, true
}

func supportTicketOwner(actorID int64, admin bool) int64 {
	if admin {
		return 0
	}
	return actorID
}

func supportTicketRequest(c *gin.Context) (id, actorID int64, ok bool) {
	actorID, ok = supportTicketActor(c)
	if !ok {
		return 0, 0, false
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		response.ErrorFrom(c, service.ErrSupportTicketInput)
		return 0, 0, false
	}
	return id, actorID, true
}

func supportTicketCursor(c *gin.Context, param string) (int64, bool) {
	raw := c.Query(param)
	if raw == "" {
		return 0, true
	}
	value, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || value < 0 {
		response.ErrorFrom(c, service.ErrSupportTicketInput)
		return 0, false
	}
	return value, true
}

func bindSupportTicket(c *gin.Context, input any) bool {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, supportTicketMaxBodyBytes)
	if err := c.ShouldBindJSON(input); err != nil {
		response.ErrorFrom(c, service.ErrSupportTicketInput)
		return false
	}
	return true
}
