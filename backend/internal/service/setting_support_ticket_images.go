package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
)

const SettingKeySupportTicketImages = "support_ticket_image_settings"

// SupportTicketImageSettings contains administrator-controlled upload rates and retained attachment quotas.
type SupportTicketImageSettings struct {
	UserRPM          int `json:"user_rpm"`
	SiteRPM          int `json:"site_rpm"`
	TicketMaxImages  int `json:"ticket_max_images"`
	AccountMaxImages int `json:"account_max_images"`
	AccountMaxMiB    int `json:"account_max_mib"`
	SiteMaxImages    int `json:"site_max_images"`
	SiteMaxMiB       int `json:"site_max_mib"`
}

type supportTicketImageSettingsCache struct {
	mu        sync.Mutex
	settings  SupportTicketImageSettings
	err       error
	expiresAt time.Time
}

// DefaultSupportTicketImageSettings preserves the protection limits used before configuration was introduced.
func DefaultSupportTicketImageSettings() SupportTicketImageSettings {
	return SupportTicketImageSettings{
		UserRPM: 6, SiteRPM: 30, TicketMaxImages: 12,
		AccountMaxImages: 60, AccountMaxMiB: 100,
		SiteMaxImages: 10_000, SiteMaxMiB: 2048,
	}
}

// Validate rejects missing, unlimited and excessive values before they reach an upload request.
func (s SupportTicketImageSettings) Validate() error {
	fields := []struct {
		name  string
		value int
		max   int
	}{
		{"user_rpm", s.UserRPM, 1000},
		{"site_rpm", s.SiteRPM, 10_000},
		{"ticket_max_images", s.TicketMaxImages, 1000},
		{"account_max_images", s.AccountMaxImages, 10_000},
		{"account_max_mib", s.AccountMaxMiB, 102_400},
		{"site_max_images", s.SiteMaxImages, 1_000_000},
		{"site_max_mib", s.SiteMaxMiB, 1_048_576},
	}
	for _, field := range fields {
		if field.value < 1 || field.value > field.max {
			return infraerrors.BadRequest("INVALID_SUPPORT_TICKET_IMAGE_SETTINGS",
				fmt.Sprintf("%s must be between 1 and %d", field.name, field.max))
		}
	}
	return nil
}

// ParseSupportTicketImageSettings also supplies defaults for fields absent in older stored settings.
func ParseSupportTicketImageSettings(raw string) (SupportTicketImageSettings, error) {
	settings := DefaultSupportTicketImageSettings()
	if strings.TrimSpace(raw) != "" {
		if err := json.Unmarshal([]byte(raw), &settings); err != nil {
			return settings, err
		}
	}
	return settings, settings.Validate()
}

func (s *SettingService) GetSupportTicketImageSettings(ctx context.Context) (SupportTicketImageSettings, error) {
	raw, err := s.settingRepo.GetValue(ctx, SettingKeySupportTicketImages)
	if errors.Is(err, ErrSettingNotFound) {
		return DefaultSupportTicketImageSettings(), nil
	}
	if err != nil {
		return SupportTicketImageSettings{}, err
	}
	settings, err := ParseSupportTicketImageSettings(raw)
	if err != nil {
		return settings, ErrSupportTicketUploadUnavailable.WithCause(err)
	}
	return settings, nil
}

// SetSupportTicketImageSettings serializes saving and cache refresh so an in-flight read cannot restore stale limits.
func (s *SettingService) SetSupportTicketImageSettings(ctx context.Context, settings SupportTicketImageSettings) error {
	if err := settings.Validate(); err != nil {
		return err
	}
	data, err := json.Marshal(settings)
	if err != nil {
		return err
	}
	cache := &s.supportTicketImagesCache
	cache.mu.Lock()
	defer cache.mu.Unlock()
	if err := s.settingRepo.Set(ctx, SettingKeySupportTicketImages, string(data)); err != nil {
		return err
	}
	cache.settings, cache.err, cache.expiresAt = settings, nil, time.Now().Add(time.Minute)
	slog.InfoContext(ctx, "support_ticket_image_settings_updated", "user_rpm", settings.UserRPM,
		"site_rpm", settings.SiteRPM, "ticket_max_images", settings.TicketMaxImages,
		"account_max_images", settings.AccountMaxImages, "account_max_mib", settings.AccountMaxMiB,
		"site_max_images", settings.SiteMaxImages, "site_max_mib", settings.SiteMaxMiB)
	return nil
}

// GetSupportTicketImageSettingsCached bounds database reads on the pre-upload rate-limit path.
func (s *SettingService) GetSupportTicketImageSettingsCached(ctx context.Context) (SupportTicketImageSettings, error) {
	if s == nil || s.settingRepo == nil {
		return DefaultSupportTicketImageSettings(), nil
	}
	cache := &s.supportTicketImagesCache
	cache.mu.Lock()
	defer cache.mu.Unlock()
	if time.Now().Before(cache.expiresAt) {
		return cache.settings, cache.err
	}
	dbCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()
	settings, err := s.GetSupportTicketImageSettings(dbCtx)
	ttl := time.Minute
	if err != nil {
		ttl = 5 * time.Second
		err = ErrSupportTicketUploadUnavailable.WithCause(err)
	}
	cache.settings, cache.err, cache.expiresAt = settings, err, time.Now().Add(ttl)
	return settings, err
}
