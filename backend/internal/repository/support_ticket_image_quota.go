package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/Wei-Shaw/sub2api/internal/service"
)

const supportTicketImageQuotaLockID = 742319830252

// checkTicketImageQuota serializes the metadata check and subsequent insert across application instances.
func checkTicketImageQuota(ctx context.Context, tx *sql.Tx, ticketID, ownerID int64, images []service.SupportTicketImage) error {
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock($1)`, int64(supportTicketImageQuotaLockID)); err != nil {
		return err
	}

	// Read the current limits in this transaction, including saves made by another application node.
	var raw string
	err := tx.QueryRowContext(ctx, "SELECT value FROM settings WHERE key = $1", service.SettingKeySupportTicketImages).Scan(&raw)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	limits, err := service.ParseSupportTicketImageSettings(raw)
	if err != nil {
		return service.ErrSupportTicketUploadUnavailable.WithCause(err)
	}

	var siteCount, siteBytes, ownerCount, ownerBytes, ticketCount int64
	// A separate statement under READ COMMITTED sees uploads committed by the previous lock holder.
	err = tx.QueryRowContext(ctx, `
SELECT count(*), COALESCE(sum(a.byte_size), 0),
       count(*) FILTER (WHERE t.user_id = $1), COALESCE(sum(a.byte_size) FILTER (WHERE t.user_id = $1), 0),
       count(*) FILTER (WHERE a.ticket_id = $2)
FROM support_ticket_images a JOIN support_tickets t ON t.id = a.ticket_id`, ownerID, ticketID).
		Scan(&siteCount, &siteBytes, &ownerCount, &ownerBytes, &ticketCount)
	if err != nil {
		return err
	}

	count := int64(len(images))
	var size int64
	for _, image := range images {
		size += int64(len(image.Data))
	}
	switch {
	case ticketCount+count > int64(limits.TicketMaxImages):
		return service.ErrSupportTicketImageQuota.WithMetadata(map[string]string{"scope": "ticket"})
	case ownerCount+count > int64(limits.AccountMaxImages) || ownerBytes+size > int64(limits.AccountMaxMiB)<<20:
		return service.ErrSupportTicketImageQuota.WithMetadata(map[string]string{"scope": "account"})
	case siteCount+count > int64(limits.SiteMaxImages) || siteBytes+size > int64(limits.SiteMaxMiB)<<20:
		return service.ErrSupportTicketImageQuota.WithMetadata(map[string]string{"scope": "site"})
	default:
		return nil
	}
}
