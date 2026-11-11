package service

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSupportTicketImageSettingsSaveUpdatesCache(t *testing.T) {
	ctx := context.Background()
	repo := &panelRateLimitSettingRepo{}
	svc := newPanelRateLimitTestService(repo)
	defaults := DefaultSupportTicketImageSettings()
	loaded, err := svc.GetSupportTicketImageSettingsCached(ctx)
	require.NoError(t, err)
	require.Equal(t, defaults, loaded)

	updated := defaults
	updated.UserRPM, updated.TicketMaxImages = 2, 1
	require.NoError(t, svc.SetSupportTicketImageSettings(ctx, updated))
	cached, err := svc.GetSupportTicketImageSettingsCached(ctx)
	require.NoError(t, err)
	require.Equal(t, updated, cached)
	persisted, err := svc.GetSupportTicketImageSettings(ctx)
	require.NoError(t, err)
	require.Equal(t, updated, persisted)

	invalid := updated
	invalid.SiteMaxMiB = 0
	require.Error(t, svc.SetSupportTicketImageSettings(ctx, invalid))
	unchanged, err := svc.GetSupportTicketImageSettings(ctx)
	require.NoError(t, err)
	require.Equal(t, updated, unchanged)
}

func TestSupportTicketImageSettingsCorruptDataFailsClosed(t *testing.T) {
	ctx := context.Background()
	repo := &panelRateLimitSettingRepo{values: map[string]string{SettingKeySupportTicketImages: `{"user_rpm":0}`}}
	svc := newPanelRateLimitTestService(repo)
	_, err := svc.GetSupportTicketImageSettingsCached(ctx)
	require.ErrorIs(t, err, ErrSupportTicketUploadUnavailable)
	_, err = svc.GetSupportTicketImageSettingsCached(ctx)
	require.ErrorIs(t, err, ErrSupportTicketUploadUnavailable)
	require.Equal(t, 1, repo.getValueCalls)

	repo.getValueErr = errors.New("database unavailable")
	require.NoError(t, svc.SetSupportTicketImageSettings(ctx, DefaultSupportTicketImageSettings()))
	_, err = svc.GetSupportTicketImageSettingsCached(ctx)
	require.NoError(t, err)
}
