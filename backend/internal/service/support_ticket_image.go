package service

import (
	"bytes"
	"context"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"net/http"

	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"golang.org/x/image/webp"
)

const (
	SupportTicketMaxImages     = 3
	SupportTicketMaxImageBytes = 5 << 20
	supportTicketMaxPixels     = 16_000_000
)

var (
	ErrSupportTicketImage = infraerrors.BadRequest("SUPPORT_TICKET_INVALID_IMAGE",
		"Attach up to three valid PNG, JPEG or WebP images of at most 5 MiB and 16 megapixels each.")
	ErrSupportTicketImageQuota = infraerrors.TooManyRequests("SUPPORT_TICKET_IMAGE_QUOTA",
		"The ticket image quota has been reached. Remove the selected images to send a text-only message.")
	ErrSupportTicketUploadBusy        = infraerrors.TooManyRequests("SUPPORT_TICKET_UPLOAD_BUSY", "Image uploads are busy. Try again shortly.")
	ErrSupportTicketUploadUnavailable = infraerrors.ServiceUnavailable("SUPPORT_TICKET_UPLOAD_UNAVAILABLE", "Image uploads are temporarily unavailable.")
)

type SupportTicketImage struct {
	ContentType string
	Data        []byte
}

// validateTicketImages identifies and decodes raster images within the pixel budget.
func validateTicketImages(images []SupportTicketImage) error {
	if len(images) > SupportTicketMaxImages {
		return ErrSupportTicketImage
	}
	for i := range images {
		item := &images[i]
		if len(item.Data) > SupportTicketMaxImageBytes {
			return ErrSupportTicketImage
		}
		reader := bytes.NewReader(item.Data)
		var decodeConfig func(reader io.Reader) (image.Config, error)
		var decode func(reader io.Reader) (image.Image, error)
		item.ContentType = http.DetectContentType(item.Data)
		switch item.ContentType {
		case "image/png":
			decodeConfig, decode = png.DecodeConfig, png.Decode
		case "image/jpeg":
			decodeConfig, decode = jpeg.DecodeConfig, jpeg.Decode
		case "image/webp":
			decodeConfig, decode = webp.DecodeConfig, webp.Decode
		default:
			return ErrSupportTicketImage
		}
		cfg, err := decodeConfig(reader)
		if err != nil || cfg.Width <= 0 || cfg.Height <= 0 || cfg.Width > supportTicketMaxPixels/cfg.Height {
			return ErrSupportTicketImage
		}
		reader.Reset(item.Data)
		if _, err := decode(reader); err != nil {
			return ErrSupportTicketImage
		}
	}
	return nil
}

// Image reads a single attachment under the same owner scope as the ticket.
func (s *SupportTicketService) Image(ctx context.Context, id, ownerID, version, position int64) (SupportTicketImage, error) {
	return s.repo.Image(ctx, id, ownerID, version, position)
}
