//go:build integration

package repository

import (
	"bytes"
	"context"
	"fmt"
	"image"
	"image/png"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/stretchr/testify/require"
)

func TestSupportTicketLifecycle(t *testing.T) {
	ctx := context.Background()
	db := testEntClient(t)
	createUser := func(label string) int64 {
		t.Helper()
		user, err := db.User.Create().
			SetEmail(fmt.Sprintf("ticket-%s-%d@example.com", label, time.Now().UnixNano())).
			SetPasswordHash("test-password-hash").
			Save(ctx)
		require.NoError(t, err)
		return user.ID
	}
	owner, other, admin := createUser("owner"), createUser("other"), createUser("admin")
	svc := service.NewSupportTicketService(NewSupportTicketRepository(integrationDB))
	input := service.SupportTicketCreate{
		Subject: "Private ticket", Category: "api", Body: "Private report",
		Images: []service.SupportTicketImage{{Data: []byte("<svg onload='alert(1)'/>")}},
	}
	_, _, err := svc.Create(ctx, owner, "ticket-request-1", input)
	require.ErrorIs(t, err, service.ErrSupportTicketImage)

	var screenshot bytes.Buffer
	require.NoError(t, png.Encode(&screenshot, image.NewRGBA(image.Rect(0, 0, 2, 2))))
	input.Images[0].Data = screenshot.Bytes()
	id, created, err := svc.Create(ctx, owner, "ticket-request-1", input)
	require.NoError(t, err)
	require.True(t, created)
	replayedID, created, err := svc.Create(ctx, owner, "ticket-request-1", input)
	require.NoError(t, err)
	require.False(t, created)
	require.Equal(t, id, replayedID)
	input.Images = nil
	_, _, err = svc.Create(ctx, owner, "ticket-request-1", input)
	require.ErrorIs(t, err, service.ErrIdempotencyKeyConflict)

	stored, err := svc.Image(ctx, id, owner, 1, 1)
	require.NoError(t, err)
	require.Equal(t, "image/png", stored.ContentType)
	require.Equal(t, screenshot.Bytes(), stored.Data)
	_, err = svc.Image(ctx, id, other, 1, 1)
	require.ErrorIs(t, err, service.ErrSupportTicketNotFound)
	_, err = svc.Image(ctx, id, owner, 1, 2)
	require.ErrorIs(t, err, service.ErrSupportTicketNotFound)

	_, err = svc.Detail(ctx, id, other, 0)
	require.ErrorIs(t, err, service.ErrSupportTicketNotFound)
	_, err = svc.Act(ctx, id, other, false, service.SupportTicketAction{Version: 1, Action: "reply", Body: "Cross-user reply"})
	require.ErrorIs(t, err, service.ErrSupportTicketNotFound)
	list, count, err := svc.List(ctx, other, "", 20, 0)
	require.NoError(t, err)
	require.Zero(t, count)
	require.Empty(t, list)

	// Competing actions at the same version must add just one event.
	errs := make(chan error, 2)
	for range 2 {
		go func() {
			_, err := svc.Act(ctx, id, admin, true, service.SupportTicketAction{
				Version: 1, Action: "reply", Body: "Request context",
				Images: []service.SupportTicketImage{{Data: screenshot.Bytes()}},
			})
			errs <- err
		}()
	}
	first, second := <-errs, <-errs
	if first == nil {
		first, second = second, first
	}
	require.ErrorIs(t, first, service.ErrSupportTicketConflict)
	require.NoError(t, second)

	// A support reply stays unread until the requester opens the latest page.
	requireUnread := func(want bool) {
		t.Helper()
		summary, err := svc.Summary(ctx, owner)
		require.NoError(t, err)
		list, _, err := svc.List(ctx, owner, "", 20, 0)
		require.NoError(t, err)
		require.Len(t, list, 1)
		require.Equal(t, want, list[0].Unread)
		if want {
			require.Equal(t, int64(1), summary.Attention)
		} else {
			require.Zero(t, summary.Attention)
		}
	}
	requireUnread(true)
	_, err = svc.Detail(ctx, id, owner, 2)
	require.NoError(t, err)
	_, err = svc.Detail(ctx, id, 0, 0)
	require.NoError(t, err)
	requireUnread(true)
	_, err = svc.Detail(ctx, id, owner, 0)
	require.NoError(t, err)
	requireUnread(false)
	otherSummary, err := svc.Summary(ctx, other)
	require.NoError(t, err)
	require.Equal(t, service.SupportTicketSummary{}, otherSummary)
	queue, err := svc.Summary(ctx, 0)
	require.NoError(t, err)

	act := func(actor int64, isAdmin bool, version int64, action, body, status string) {
		t.Helper()
		ticket, err := svc.Act(ctx, id, actor, isAdmin, service.SupportTicketAction{Version: version, Action: action, Body: body})
		require.NoError(t, err)
		require.Equal(t, status, ticket.Status)
		require.Equal(t, version+1, ticket.Version)
	}
	act(owner, false, 2, "reply", "Private context", service.TicketWaitingSupport)
	requireUnread(false)
	waiting, err := svc.Summary(ctx, 0)
	require.NoError(t, err)
	require.Equal(t, queue.Attention+1, waiting.Attention)
	require.Equal(t, queue.Activity+1, waiting.Activity)
	act(admin, true, 3, "resolve", "First solution", service.TicketResolved)
	requireUnread(true)
	act(owner, false, 4, "reopen", "The issue persists", service.TicketWaitingSupport)
	act(admin, true, 5, "resolve", "Second solution", service.TicketResolved)
	_, err = svc.Act(ctx, id, admin, true, service.SupportTicketAction{Version: 6, Action: "confirm"})
	require.ErrorIs(t, err, service.ErrSupportTicketAction)

	published, revision := true, int64(0)
	update := service.SupportTicketKnowledgeUpdate{
		Published: &published, Revision: &revision, Question: "Public question", Answer: "Public answer",
	}
	_, err = svc.SetKnowledge(ctx, id, admin, update)
	require.ErrorIs(t, err, service.ErrSupportTicketAction)
	act(owner, false, 6, "confirm", "", service.TicketClosed)
	item, err := svc.SetKnowledge(ctx, id, admin, update)
	require.NoError(t, err)
	require.Equal(t, int64(1), item.Revision)

	detail, err := svc.Detail(ctx, id, owner, 0)
	require.NoError(t, err)
	require.Nil(t, detail.Knowledge)
	require.Len(t, detail.Events, 7)
	require.Equal(t, "Private report", detail.Events[0].Body)
	require.Equal(t, 1, detail.Events[0].ImageCount)
	require.Equal(t, 1, detail.Events[1].ImageCount)
	require.Zero(t, detail.Events[2].ImageCount)
	require.Equal(t, "confirm", detail.Events[6].Action)
	replyImage, err := svc.Image(ctx, id, owner, 2, 1)
	require.NoError(t, err)
	require.Equal(t, screenshot.Bytes(), replyImage.Data)

	items, err := svc.ListKnowledge(ctx, id-1, 1)
	require.NoError(t, err)
	require.Len(t, items, 1)
	require.Equal(t, id, items[0].ID)
	require.Equal(t, "Public question", items[0].Question)
	require.Equal(t, "Public answer", items[0].Answer)

	published, revision = false, item.Revision
	withdrawn, err := svc.SetKnowledge(ctx, id, admin, update)
	require.NoError(t, err)
	require.False(t, withdrawn.Published)
	require.Empty(t, withdrawn.Answer)
	published = true
	_, err = svc.SetKnowledge(ctx, id, admin, update)
	require.ErrorIs(t, err, service.ErrSupportTicketConflict)
	items, err = svc.ListKnowledge(ctx, id-1, 1)
	require.NoError(t, err)
	require.Empty(t, items)

	// Either side can close an open ticket with an optional note, and either side can reopen it with a reason.
	act(admin, true, 7, "reopen", "Following up on the fix", service.TicketWaitingUser)
	requireUnread(true)
	act(owner, false, 8, "close", "", service.TicketClosed)
	requireUnread(false)
	_, err = svc.Act(ctx, id, owner, false, service.SupportTicketAction{Version: 9, Action: "reopen"})
	require.ErrorIs(t, err, service.ErrSupportTicketInput)
	act(owner, false, 9, "reopen", "It failed again", service.TicketWaitingSupport)
	act(admin, true, 10, "close", "Duplicate of another ticket", service.TicketClosed)
	requireUnread(true)
	detail, err = svc.Detail(ctx, id, owner, 0)
	require.NoError(t, err)
	last := detail.Events[len(detail.Events)-1]
	require.Equal(t, "close", last.Action)
	require.Equal(t, "admin", last.ActorRole)
	require.Equal(t, "Duplicate of another ticket", last.Body)
}
