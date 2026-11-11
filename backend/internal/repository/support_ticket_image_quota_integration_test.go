//go:build integration

package repository

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/png"
	"testing"
	"time"

	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/stretchr/testify/require"
)

func TestSupportTicketImageQuotas(t *testing.T) {
	defaults := service.DefaultSupportTicketImageSettings()
	supportTicketMaxTicketImages, supportTicketMaxOwnerImages := defaults.TicketMaxImages, defaults.AccountMaxImages
	supportTicketMaxOwnerBytes, supportTicketMaxSiteImages := defaults.AccountMaxMiB<<20, defaults.SiteMaxImages
	ctx := context.Background()
	db := testEntClient(t)
	newOwner := func(label string) int64 {
		t.Helper()
		user, err := db.User.Create().
			SetEmail(fmt.Sprintf("ticket-quota-%s-%d@example.com", label, time.Now().UnixNano())).
			SetPasswordHash("test-password-hash").Save(ctx)
		require.NoError(t, err)
		t.Cleanup(func() {
			_, err := integrationDB.ExecContext(ctx, "DELETE FROM support_tickets WHERE user_id = $1", user.ID)
			require.NoError(t, err)
		})
		return user.ID
	}
	owner, byteOwner, other := newOwner("count"), newOwner("bytes"), newOwner("other")
	svc := service.NewSupportTicketService(NewSupportTicketRepository(integrationDB))
	text := service.SupportTicketCreate{Subject: "Quota", Category: "api", Body: "Quota test"}
	var pngData bytes.Buffer
	require.NoError(t, png.Encode(&pngData, image.NewRGBA(image.Rect(0, 0, 2, 2))))
	withImage := text
	withImage.Images = []service.SupportTicketImage{{Data: pngData.Bytes()}}

	newTicket := func(ownerID int64, key string) int64 {
		t.Helper()
		id, _, err := svc.Create(ctx, ownerID, key, text)
		require.NoError(t, err)
		return id
	}
	// Seed legacy attachments directly to reach storage boundaries without thousands of service calls.
	seedImages := func(ticketID int64, count, bytesPerImage int) {
		t.Helper()
		_, err := integrationDB.ExecContext(ctx, `
WITH events AS (
    INSERT INTO support_ticket_events (ticket_id, version, actor_role, action, body, created_at)
    SELECT $1, n, 'user', 'reply', 'Legacy attachment', NOW() FROM generate_series(2, 1 + $2::integer) n
    RETURNING ticket_id, version
)
INSERT INTO support_ticket_images (ticket_id, event_version, position, content_type, data)
SELECT ticket_id, version, 1, 'image/png', decode(repeat('00', $3::integer), 'hex') FROM events`, ticketID, count, bytesPerImage)
		require.NoError(t, err)
	}
	requireScope := func(err error, scope string) {
		t.Helper()
		require.ErrorIs(t, err, service.ErrSupportTicketImageQuota)
		require.Equal(t, scope, infraerrors.FromError(err).Metadata["scope"])
	}

	// An over-limit reply cannot advance the ticket or leave a new event.
	fullTicket := newTicket(owner, "full-ticket")
	seedImages(fullTicket, supportTicketMaxTicketImages, 1)
	_, err := integrationDB.ExecContext(ctx, "UPDATE support_tickets SET version = $2 WHERE id = $1", fullTicket, supportTicketMaxTicketImages+1)
	require.NoError(t, err)
	reply := service.SupportTicketAction{Version: int64(supportTicketMaxTicketImages + 1), Action: "reply", Body: "One more", Images: withImage.Images}
	_, err = svc.Act(ctx, fullTicket, owner, false, reply)
	requireScope(err, "ticket")
	detail, err := svc.Detail(ctx, fullTicket, owner, 0)
	require.NoError(t, err)
	require.Equal(t, reply.Version, detail.Version)
	require.Len(t, detail.Events, supportTicketMaxTicketImages+1)
	reply.Images = nil
	_, err = svc.Act(ctx, fullTicket, owner, false, reply)
	require.NoError(t, err)

	// Competing uploads to different tickets cannot both consume the final account slot.
	seedImages(newTicket(owner, "account-legacy"), supportTicketMaxOwnerImages-supportTicketMaxTicketImages-1, 1)
	type creation struct {
		id  int64
		key string
		err error
	}
	start := make(chan struct{})
	results := make(chan creation, 2)
	for _, key := range []string{"concurrent-a", "concurrent-b"} {
		go func() {
			<-start
			input := withImage
			input.Images = append([]service.SupportTicketImage(nil), withImage.Images...)
			id, _, err := svc.Create(ctx, owner, key, input)
			results <- creation{id, key, err}
		}()
	}
	close(start)
	a, b := <-results, <-results
	if a.err != nil {
		a, b = b, a
	}
	require.NoError(t, a.err)
	requireScope(b.err, "account")
	replayed, created, err := svc.Create(ctx, owner, a.key, withImage)
	require.NoError(t, err)
	require.False(t, created)
	require.Equal(t, a.id, replayed)
	newTicket(owner, b.key) // The rejected request left no ticket or idempotency reservation.

	// Count raw bytes even for highly compressed stored data.
	seedImages(newTicket(byteOwner, "bytes-legacy"), supportTicketMaxOwnerBytes/service.SupportTicketMaxImageBytes, service.SupportTicketMaxImageBytes)
	_, _, err = svc.Create(ctx, byteOwner, "over-bytes", withImage)
	requireScope(err, "account")

	var siteCount int
	require.NoError(t, integrationDB.QueryRowContext(ctx, "SELECT count(*) FROM support_ticket_images").Scan(&siteCount))
	seedImages(newTicket(byteOwner, "site-legacy"), supportTicketMaxSiteImages-siteCount, 1)
	_, _, err = svc.Create(ctx, other, "over-site", withImage)
	requireScope(err, "site")
	newTicket(other, "over-site")
}

func TestSupportTicketImageQuotaSettingsApplyOnNextUpload(t *testing.T) {
	ctx := context.Background()
	db := testEntClient(t)
	user, err := db.User.Create().SetEmail(fmt.Sprintf("ticket-settings-%d@example.com", time.Now().UnixNano())).SetPasswordHash("test").Save(ctx)
	require.NoError(t, err)
	var prior string
	priorErr := integrationDB.QueryRowContext(ctx, "SELECT value FROM settings WHERE key = $1", service.SettingKeySupportTicketImages).Scan(&prior)
	require.True(t, priorErr == nil || errors.Is(priorErr, sql.ErrNoRows))
	t.Cleanup(func() {
		_, err := integrationDB.ExecContext(ctx, "DELETE FROM support_tickets WHERE user_id = $1", user.ID)
		require.NoError(t, err)
		if priorErr == nil {
			_, err = integrationDB.ExecContext(ctx, "UPDATE settings SET value = $2 WHERE key = $1", service.SettingKeySupportTicketImages, prior)
		} else {
			_, err = integrationDB.ExecContext(ctx, "DELETE FROM settings WHERE key = $1", service.SettingKeySupportTicketImages)
		}
		require.NoError(t, err)
	})
	limits := service.DefaultSupportTicketImageSettings()
	limits.TicketMaxImages = 1
	setLimits := func() {
		t.Helper()
		data, err := json.Marshal(limits)
		require.NoError(t, err)
		_, err = integrationDB.ExecContext(ctx, `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, service.SettingKeySupportTicketImages, string(data))
		require.NoError(t, err)
	}
	setLimits()
	var screenshot bytes.Buffer
	require.NoError(t, png.Encode(&screenshot, image.NewRGBA(image.Rect(0, 0, 2, 2))))
	svc := service.NewSupportTicketService(NewSupportTicketRepository(integrationDB))
	id, _, err := svc.Create(ctx, user.ID, "configurable-image-quota", service.SupportTicketCreate{
		Subject: "Configured quota", Category: "api", Body: "Image",
		Images: []service.SupportTicketImage{{Data: screenshot.Bytes()}},
	})
	require.NoError(t, err)
	reply := service.SupportTicketAction{Version: 1, Action: "reply", Body: "Another image", Images: []service.SupportTicketImage{{Data: screenshot.Bytes()}}}
	_, err = svc.Act(ctx, id, user.ID, false, reply)
	require.ErrorIs(t, err, service.ErrSupportTicketImageQuota)
	limits.TicketMaxImages = 2
	setLimits()
	updated, err := svc.Act(ctx, id, user.ID, false, reply)
	require.NoError(t, err)
	require.Equal(t, int64(2), updated.Version)
}
