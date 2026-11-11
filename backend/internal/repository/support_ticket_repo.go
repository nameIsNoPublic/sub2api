package repository

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"slices"

	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/lib/pq"
)

const supportTicketColumns = `id, user_id, subject, category, status, version, created_at, updated_at`
const supportTicketHistoryPageSize = 50

// supportTicketRepository keeps ticket state and its event history in PostgreSQL.
type supportTicketRepository struct {
	db *sql.DB
}

func NewSupportTicketRepository(db *sql.DB) service.SupportTicketRepository {
	return &supportTicketRepository{db: db}
}

// Create saves the ticket, its opening event and any images in one transaction.
func (r *supportTicketRepository) Create(ctx context.Context, userID int64, keyHash string, input service.SupportTicketCreate) (int64, bool, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return 0, false, err
	}
	defer func() { _ = tx.Rollback() }()

	var id int64
	err = tx.QueryRowContext(ctx, `
WITH ticket AS (
    INSERT INTO support_tickets (user_id, create_key_hash, subject, category) VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, create_key_hash) DO NOTHING
    RETURNING id, version, created_at
)
INSERT INTO support_ticket_events (ticket_id, version, actor_id, actor_role, action, body, created_at)
SELECT id, version, $1, 'user', 'create', $5, created_at FROM ticket
RETURNING ticket_id`, userID, keyHash, input.Subject, input.Category, input.Body).Scan(&id)
	if err == nil {
		if err := insertTicketImages(ctx, tx, id, 1, userID, input.Images); err != nil {
			return 0, false, err
		}
		if err := tx.Commit(); err != nil {
			return 0, false, err
		}
		return id, true, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return 0, false, err
	}

	// A second statement sees the winner even when the concurrent insert committed after our first snapshot.
	hashes := make([]string, len(input.Images))
	for i, item := range input.Images {
		digest := sha256.Sum256(item.Data)
		hashes[i] = hex.EncodeToString(digest[:])
	}
	var matches bool
	err = tx.QueryRowContext(ctx, `
SELECT t.id, t.subject = $3 AND t.category = $4 AND e.body = $5
    AND ARRAY(
        SELECT encode(sha256(a.data), 'hex') FROM support_ticket_images a
        WHERE a.ticket_id = e.ticket_id AND a.event_version = e.version ORDER BY a.position
    ) = $6::text[]
FROM support_tickets t JOIN support_ticket_events e ON e.ticket_id = t.id AND e.version = 1
WHERE t.user_id = $1 AND t.create_key_hash = $2`, userID, keyHash, input.Subject, input.Category, input.Body, pq.Array(hashes)).Scan(&id, &matches)
	if err != nil {
		return 0, false, err
	}
	if !matches {
		return 0, false, service.ErrIdempotencyKeyConflict
	}
	return id, false, nil
}

// List returns a page of ticket summaries and a count from the same snapshot.
func (r *supportTicketRepository) List(ctx context.Context, ownerID int64, status string, limit, offset int) ([]service.SupportTicket, int64, error) {
	const filter = ` FROM support_tickets WHERE ($1::bigint = 0 OR user_id = $1) AND ($2 = '' OR status = $2)`
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelRepeatableRead, ReadOnly: true})
	if err != nil {
		return nil, 0, err
	}
	defer func() { _ = tx.Rollback() }()

	var total int64
	if err := tx.QueryRowContext(ctx, `SELECT COUNT(*)`+filter, ownerID, status).Scan(&total); err != nil {
		return nil, 0, err
	}
	// Read state belongs to the requester, so the administrator queue never reports it.
	rows, err := tx.QueryContext(ctx, `SELECT `+supportTicketColumns+`, $1::bigint <> 0 AND version > user_seen_version`+filter+
		` ORDER BY updated_at DESC, id DESC LIMIT $3 OFFSET $4`, ownerID, status, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer func() { _ = rows.Close() }()
	items := make([]service.SupportTicket, 0)
	for rows.Next() {
		var item service.SupportTicket
		if err := rows.Scan(&item.ID, &item.UserID, &item.Subject, &item.Category, &item.Status, &item.Version,
			&item.CreatedAt, &item.UpdatedAt, &item.Unread); err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	return items, total, rows.Err()
}

// Summary counts the requester's unseen updates, or the administrator queue waiting for support.
func (r *supportTicketRepository) Summary(ctx context.Context, ownerID int64) (service.SupportTicketSummary, error) {
	var item service.SupportTicketSummary
	err := r.db.QueryRowContext(ctx, `
SELECT count(*) FILTER (WHERE CASE WHEN $1::bigint = 0 THEN status = 'waiting_support' ELSE version > user_seen_version END),
    COALESCE(sum(version), 0)::bigint
FROM support_tickets WHERE $1::bigint = 0 OR user_id = $1`, ownerID).Scan(&item.Attention, &item.Activity)
	return item, err
}

// MarkSeen only moves the marker forward, so a slow request cannot hide a newer reply.
func (r *supportTicketRepository) MarkSeen(ctx context.Context, id, ownerID, version int64) error {
	_, err := r.db.ExecContext(ctx, `
UPDATE support_tickets SET user_seen_version = $3 WHERE id = $1 AND user_id = $2 AND user_seen_version < $3`, id, ownerID, version)
	return err
}

func (r *supportTicketRepository) Get(ctx context.Context, id, ownerID int64) (service.SupportTicket, error) {
	return getSupportTicket(ctx, r.db, id, ownerID)
}

func getSupportTicket(ctx context.Context, db interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
}, id, ownerID int64) (service.SupportTicket, error) {
	item, err := scanSupportTicket(db.QueryRowContext(ctx, `SELECT `+supportTicketColumns+
		` FROM support_tickets WHERE id = $1 AND ($2::bigint = 0 OR user_id = $2)`, id, ownerID))
	if errors.Is(err, sql.ErrNoRows) {
		err = service.ErrSupportTicketNotFound
	}
	return item, err
}

// Detail checks ownership before reading the conversation or the admin-only knowledge fields.
func (r *supportTicketRepository) Detail(ctx context.Context, id, ownerID, before int64) (service.SupportTicketDetail, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelRepeatableRead, ReadOnly: true})
	if err != nil {
		return service.SupportTicketDetail{}, err
	}
	defer func() { _ = tx.Rollback() }()
	ticket, err := getSupportTicket(ctx, tx, id, ownerID)
	if err != nil {
		return service.SupportTicketDetail{}, err
	}
	detail := service.SupportTicketDetail{SupportTicket: ticket}
	if ownerID == 0 && ticket.Status == service.TicketClosed {
		item, err := scanSupportTicketKnowledge(tx.QueryRowContext(ctx, `
SELECT revision, published, question, answer, updated_at FROM support_ticket_knowledge WHERE ticket_id = $1`, id))
		if err == nil {
			detail.Knowledge = &item
		} else if !errors.Is(err, sql.ErrNoRows) {
			return service.SupportTicketDetail{}, err
		}
	}

	rows, err := tx.QueryContext(ctx, `
SELECT e.version, e.actor_role, e.action, e.body, e.created_at,
    (SELECT count(*) FROM support_ticket_images a WHERE a.ticket_id = e.ticket_id AND a.event_version = e.version)
FROM support_ticket_events e
WHERE e.ticket_id = $1 AND ($2::bigint = 0 OR e.version < $2) ORDER BY e.version DESC LIMIT $3`,
		id, before, supportTicketHistoryPageSize+1)
	if err != nil {
		return service.SupportTicketDetail{}, err
	}
	defer func() { _ = rows.Close() }()
	detail.Events = make([]service.SupportTicketEvent, 0)
	for rows.Next() {
		var item service.SupportTicketEvent
		if err := rows.Scan(&item.Version, &item.ActorRole, &item.Action, &item.Body, &item.CreatedAt, &item.ImageCount); err != nil {
			return service.SupportTicketDetail{}, err
		}
		detail.Events = append(detail.Events, item)
	}
	if len(detail.Events) > supportTicketHistoryPageSize {
		detail.Events = detail.Events[:supportTicketHistoryPageSize]
		detail.NextBefore = detail.Events[len(detail.Events)-1].Version
	}
	slices.Reverse(detail.Events)
	return detail, rows.Err()
}

// Apply guards against stale or repeated actions and appends history atomically with the status change.
// A requester's own action also counts as seen, so it never raises their unread badge.
func (r *supportTicketRepository) Apply(ctx context.Context, id, ownerID, actorID int64, role, next string, action service.SupportTicketAction) (service.SupportTicket, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return service.SupportTicket{}, err
	}
	defer func() { _ = tx.Rollback() }()

	item, err := scanSupportTicket(tx.QueryRowContext(ctx, `
WITH ticket AS (
    UPDATE support_tickets
    SET status = $4, version = version + 1, updated_at = GREATEST(updated_at, NOW()),
        user_seen_version = CASE WHEN $2::bigint = 0 THEN user_seen_version ELSE version + 1 END
    WHERE id = $1 AND ($2::bigint = 0 OR user_id = $2) AND version = $3
    RETURNING `+supportTicketColumns+`
), event AS (
    INSERT INTO support_ticket_events (ticket_id, version, actor_id, actor_role, action, body, created_at)
    SELECT id, version, $5, $6, $7, $8, updated_at FROM ticket
)
SELECT `+supportTicketColumns+` FROM ticket`, id, ownerID, action.Version, next, actorID, role, action.Action, action.Body))
	if errors.Is(err, sql.ErrNoRows) {
		return service.SupportTicket{}, service.ErrSupportTicketConflict
	}
	if err != nil {
		return service.SupportTicket{}, err
	}
	if err := insertTicketImages(ctx, tx, id, item.Version, item.UserID, action.Images); err != nil {
		return service.SupportTicket{}, err
	}
	return item, tx.Commit()
}

// Image scopes the byte read by both the ticket and its authenticated owner.
func (r *supportTicketRepository) Image(ctx context.Context, id, ownerID, version, position int64) (service.SupportTicketImage, error) {
	var item service.SupportTicketImage
	err := r.db.QueryRowContext(ctx, `
SELECT a.content_type, a.data FROM support_ticket_images a JOIN support_tickets t ON t.id = a.ticket_id
WHERE t.id = $1 AND ($2::bigint = 0 OR t.user_id = $2) AND a.event_version = $3 AND a.position = $4`,
		id, ownerID, version, position).Scan(&item.ContentType, &item.Data)
	if errors.Is(err, sql.ErrNoRows) {
		err = service.ErrSupportTicketNotFound
	}
	return item, err
}

// insertTicketImages assigns stable positions within one event in the caller's transaction.
func insertTicketImages(ctx context.Context, tx *sql.Tx, id, version, ownerID int64, images []service.SupportTicketImage) error {
	if len(images) == 0 {
		return nil
	}
	if err := checkTicketImageQuota(ctx, tx, id, ownerID, images); err != nil {
		return err
	}
	for i, item := range images {
		if _, err := tx.ExecContext(ctx, `
INSERT INTO support_ticket_images (ticket_id, event_version, position, content_type, data)
VALUES ($1, $2, $3, $4, $5)`, id, version, i+1, item.ContentType, item.Data); err != nil {
			return err
		}
	}
	return nil
}

// SetKnowledge uses an independent revision so stale edits cannot undo a withdrawal.
func (r *supportTicketRepository) SetKnowledge(ctx context.Context, id int64, input service.SupportTicketKnowledgeUpdate) (service.SupportTicketKnowledge, error) {
	const returning = ` RETURNING revision, published, question, answer, updated_at`
	var row *sql.Row
	if *input.Revision == 0 {
		row = r.db.QueryRowContext(ctx, `
INSERT INTO support_ticket_knowledge (ticket_id, published, question, answer)
VALUES ($1, $2, $3, $4) ON CONFLICT (ticket_id) DO NOTHING`+returning, id, *input.Published, input.Question, input.Answer)
	} else {
		row = r.db.QueryRowContext(ctx, `
UPDATE support_ticket_knowledge SET published = $2, question = $3, answer = $4, revision = revision + 1, updated_at = NOW()
WHERE ticket_id = $1 AND revision = $5`+returning, id, *input.Published, input.Question, input.Answer, *input.Revision)
	}
	item, err := scanSupportTicketKnowledge(row)
	if errors.Is(err, sql.ErrNoRows) {
		err = service.ErrSupportTicketConflict
	}
	return item, err
}

// ListKnowledge projects only published Q&A and the fields needed to synchronize an index.
func (r *supportTicketRepository) ListKnowledge(ctx context.Context, after int64, limit int) ([]service.SupportTicketKnowledgeItem, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT k.ticket_id, t.category, k.question, k.answer, k.revision, k.updated_at
FROM support_ticket_knowledge k JOIN support_tickets t ON t.id = k.ticket_id
WHERE k.published AND k.ticket_id > $1 ORDER BY k.ticket_id LIMIT $2`, after, limit)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	items := make([]service.SupportTicketKnowledgeItem, 0)
	for rows.Next() {
		var item service.SupportTicketKnowledgeItem
		if err := rows.Scan(&item.ID, &item.Category, &item.Question, &item.Answer, &item.Revision, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func scanSupportTicket(row interface{ Scan(...any) error }) (service.SupportTicket, error) {
	var item service.SupportTicket
	err := row.Scan(&item.ID, &item.UserID, &item.Subject, &item.Category, &item.Status, &item.Version, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func scanSupportTicketKnowledge(row *sql.Row) (service.SupportTicketKnowledge, error) {
	var item service.SupportTicketKnowledge
	err := row.Scan(&item.Revision, &item.Published, &item.Question, &item.Answer, &item.UpdatedAt)
	return item, err
}
