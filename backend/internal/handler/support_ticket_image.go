package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"github.com/Wei-Shaw/sub2api/internal/pkg/httputil"
	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	middleware2 "github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

const supportTicketMaxUploadBytes = service.SupportTicketMaxImages*service.SupportTicketMaxImageBytes + (256 << 10)

// limitImageUploads keeps a fixed per-process budget for buffering and decoding attachments.
func (h *SupportTicketHandler) limitImageUploads(c *gin.Context) {
	if !middleware2.IsSupportTicketMultipart(c.Request) {
		c.Next()
		return
	}
	actorID, ok := supportTicketActor(c)
	if !ok {
		c.Abort()
		return
	}
	const maxConcurrentUploads = 2
	release, acquired := h.uploadSlots.TryAcquire(true, maxConcurrentUploads)
	if !acquired {
		rejectBusyTicketUpload(c)
		return
	}
	defer release()
	if _, active := h.uploadActors.LoadOrStore(actorID, struct{}{}); active {
		rejectBusyTicketUpload(c)
		return
	}
	defer h.uploadActors.Delete(actorID)
	c.Next()
}

func rejectBusyTicketUpload(c *gin.Context) {
	if c.Request.ProtoMajor == 1 {
		c.Header("Connection", "close")
	}
	c.Header("Retry-After", "5")
	c.Abort()
	response.ErrorFrom(c, service.ErrSupportTicketUploadBusy)
}

// bindSupportTicketMessage preserves JSON-only clients and reads bounded multipart parts for attachments.
func bindSupportTicketMessage(c *gin.Context, input any, images *[]service.SupportTicketImage) bool {
	if !middleware2.IsSupportTicketMultipart(c.Request) {
		return bindSupportTicket(c, input)
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, supportTicketMaxUploadBytes)
	err := readSupportTicketMultipart(c.Request, input, images)
	if err != nil && c.Request.ProtoMajor == 1 {
		c.Header("Connection", "close")
	}
	return !response.ErrorFrom(c, err)
}

// readSupportTicketMultipart reads only the message payload and image parts without staging temporary files.
func readSupportTicketMultipart(req *http.Request, input any, images *[]service.SupportTicketImage) error {
	reader, err := req.MultipartReader()
	if err != nil {
		return service.ErrSupportTicketInput
	}
	hasPayload := false
	for {
		part, err := reader.NextPart()
		if err == io.EOF {
			break
		}
		if err != nil {
			return ticketUploadReadError(req, err, service.ErrSupportTicketInput)
		}
		switch part.FormName() {
		case "payload":
			if hasPayload || part.FileName() != "" {
				return service.ErrSupportTicketInput
			}
			payload, err := io.ReadAll(io.LimitReader(part, supportTicketMaxBodyBytes+1))
			if err != nil {
				return ticketUploadReadError(req, err, service.ErrSupportTicketInput)
			}
			if len(payload) > supportTicketMaxBodyBytes || json.Unmarshal(payload, input) != nil {
				return service.ErrSupportTicketInput
			}
			hasPayload = true
		case "images":
			if len(*images) >= service.SupportTicketMaxImages || part.FileName() == "" {
				return service.ErrSupportTicketImage
			}
			data, err := io.ReadAll(io.LimitReader(part, service.SupportTicketMaxImageBytes+1))
			if err != nil {
				return ticketUploadReadError(req, err, service.ErrSupportTicketImage)
			}
			if len(data) == 0 || len(data) > service.SupportTicketMaxImageBytes {
				return service.ErrSupportTicketImage
			}
			*images = append(*images, service.SupportTicketImage{Data: data})
		default:
			return service.ErrSupportTicketInput
		}
	}
	if !hasPayload {
		return service.ErrSupportTicketInput
	}
	return nil
}

func ticketUploadReadError(req *http.Request, err, invalid error) error {
	failure := httputil.DescribeRequestBodyReadFailure(req, err)
	if failure.Status == http.StatusRequestTimeout || failure.Status == http.StatusRequestEntityTooLarge {
		return infraerrors.New(failure.Status, "SUPPORT_TICKET_UPLOAD_READ_FAILED", failure.Message)
	}
	return invalid
}

// image serves only validated image bytes, through the authenticated ticket route.
func (h *SupportTicketHandler) image(admin bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, actorID, ok := supportTicketRequest(c)
		if !ok {
			return
		}
		version, versionErr := strconv.ParseInt(c.Param("version"), 10, 64)
		position, positionErr := strconv.ParseInt(c.Param("position"), 10, 64)
		if versionErr != nil || positionErr != nil || version < 1 || position < 1 || position > service.SupportTicketMaxImages {
			response.ErrorFrom(c, service.ErrSupportTicketNotFound)
			return
		}

		item, err := h.service.Image(c.Request.Context(), id, supportTicketOwner(actorID, admin), version, position)
		if !response.ErrorFrom(c, err) {
			c.Header("X-Content-Type-Options", "nosniff")
			c.Data(http.StatusOK, item.ContentType, item.Data)
		}
	}
}
