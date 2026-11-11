package service

import (
	"context"
	"log/slog"
	"strings"
	"time"
	"unicode/utf8"

	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
)

const (
	TicketWaitingSupport = "waiting_support"
	TicketWaitingUser    = "waiting_user"
	TicketResolved       = "resolved"
	TicketClosed         = "closed"
)

var (
	ErrSupportTicketNotFound = infraerrors.NotFound("SUPPORT_TICKET_NOT_FOUND", "Support ticket not found")
	ErrSupportTicketConflict = infraerrors.Conflict("SUPPORT_TICKET_CONFLICT", "The ticket changed. Refresh and try again.")
	ErrSupportTicketAction   = infraerrors.Conflict("SUPPORT_TICKET_ACTION_UNAVAILABLE", "This action is unavailable in the current ticket status.")
	ErrSupportTicketInput    = infraerrors.BadRequest("SUPPORT_TICKET_INVALID_INPUT", "Check the ticket fields and try again.")
)

type SupportTicket struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	Subject   string    `json:"subject"`
	Category  string    `json:"category"`
	Status    string    `json:"status"`
	Version   int64     `json:"version"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	// Unread is set only in the requester's list, for support updates they have not opened yet.
	Unread bool `json:"unread,omitempty"`
}

// SupportTicketSummary feeds the navigation badge and lets open pages detect changes cheaply.
type SupportTicketSummary struct {
	// Attention counts tickets with unseen support updates for a requester, or tickets waiting for support for administrators.
	Attention int64 `json:"attention"`
	// Activity is the sum of ticket versions in scope, so it changes whenever a ticket is created or acted on.
	Activity int64 `json:"activity"`
}

type SupportTicketEvent struct {
	Version    int64     `json:"version"`
	ActorRole  string    `json:"actor_role"`
	Action     string    `json:"action"`
	Body       string    `json:"body"`
	ImageCount int       `json:"image_count,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

type SupportTicketDetail struct {
	SupportTicket
	Events     []SupportTicketEvent    `json:"events"`
	NextBefore int64                   `json:"next_before,omitempty"`
	Knowledge  *SupportTicketKnowledge `json:"knowledge,omitempty"`
}

type SupportTicketKnowledge struct {
	Revision  int64     `json:"revision"`
	Published bool      `json:"published"`
	Question  string    `json:"question"`
	Answer    string    `json:"answer"`
	UpdatedAt time.Time `json:"updated_at"`
}

type SupportTicketKnowledgeItem struct {
	ID        int64     `json:"id"`
	Category  string    `json:"category"`
	Question  string    `json:"question"`
	Answer    string    `json:"answer"`
	Revision  int64     `json:"revision"`
	UpdatedAt time.Time `json:"updated_at"`
}

type SupportTicketCreate struct {
	Subject  string               `json:"subject"`
	Category string               `json:"category"`
	Body     string               `json:"body"`
	Images   []SupportTicketImage `json:"-"`
}

type SupportTicketAction struct {
	Action  string               `json:"action"`
	Body    string               `json:"body"`
	Version int64                `json:"version"`
	Images  []SupportTicketImage `json:"-"`
}

type SupportTicketKnowledgeUpdate struct {
	Published *bool  `json:"published"`
	Question  string `json:"question"`
	Answer    string `json:"answer"`
	Revision  *int64 `json:"revision"`
}

// SupportTicketRepository scopes reads by ownerID. Zero denotes administrator access.
type SupportTicketRepository interface {
	Create(ctx context.Context, userID int64, keyHash string, input SupportTicketCreate) (id int64, created bool, err error)
	List(ctx context.Context, ownerID int64, status string, limit, offset int) ([]SupportTicket, int64, error)
	Summary(ctx context.Context, ownerID int64) (SupportTicketSummary, error)
	Get(ctx context.Context, id, ownerID int64) (SupportTicket, error)
	Detail(ctx context.Context, id, ownerID, before int64) (SupportTicketDetail, error)
	MarkSeen(ctx context.Context, id, ownerID, version int64) error
	Image(ctx context.Context, id, ownerID, version, position int64) (SupportTicketImage, error)
	Apply(ctx context.Context, id, ownerID, actorID int64, role, next string, action SupportTicketAction) (SupportTicket, error)
	SetKnowledge(ctx context.Context, id int64, input SupportTicketKnowledgeUpdate) (SupportTicketKnowledge, error)
	ListKnowledge(ctx context.Context, after int64, limit int) ([]SupportTicketKnowledgeItem, error)
}

// SupportTicketService owns the ticket lifecycle and the rules for publishing knowledge.
type SupportTicketService struct {
	repo SupportTicketRepository
}

func NewSupportTicketService(repo SupportTicketRepository) *SupportTicketService {
	return &SupportTicketService{repo: repo}
}

// Create records the ticket and its opening message together.
func (s *SupportTicketService) Create(ctx context.Context, userID int64, idempotencyKey string, input SupportTicketCreate) (id int64, created bool, err error) {
	key, err := NormalizeIdempotencyKey(idempotencyKey)
	if err != nil {
		return 0, false, err
	}
	if key == "" {
		return 0, false, ErrIdempotencyKeyRequired
	}
	input.Subject, input.Body = strings.TrimSpace(input.Subject), strings.TrimSpace(input.Body)
	if !validTicketText(input.Subject, 160) || !validTicketText(input.Body, 8000) {
		return 0, false, ErrSupportTicketInput
	}
	switch input.Category {
	case "api", "billing", "account", "other":
	default:
		return 0, false, ErrSupportTicketInput
	}
	if err := validateTicketImages(input.Images); err != nil {
		return 0, false, err
	}
	id, created, err = s.repo.Create(ctx, userID, HashIdempotencyKey(key), input)
	if err == nil && created {
		slog.InfoContext(ctx, "support_ticket_created", "ticket_id", id, "user_id", userID, "category", input.Category, "image_count", len(input.Images))
	}
	return id, created, err
}

func (s *SupportTicketService) List(ctx context.Context, ownerID int64, status string, limit, offset int) ([]SupportTicket, int64, error) {
	switch status {
	case "", TicketWaitingSupport, TicketWaitingUser, TicketResolved, TicketClosed:
		return s.repo.List(ctx, ownerID, status, limit, offset)
	default:
		return nil, 0, ErrSupportTicketInput
	}
}

func (s *SupportTicketService) Summary(ctx context.Context, ownerID int64) (SupportTicketSummary, error) {
	return s.repo.Summary(ctx, ownerID)
}

// Detail marks the latest page as seen when the requester opens it; older history pages leave the read state alone.
func (s *SupportTicketService) Detail(ctx context.Context, id, ownerID, before int64) (SupportTicketDetail, error) {
	detail, err := s.repo.Detail(ctx, id, ownerID, before)
	if err != nil || ownerID == 0 || before != 0 {
		return detail, err
	}
	// The conversation is still readable if the marker cannot be saved; the badge stays until the next visit.
	if err := s.repo.MarkSeen(ctx, id, ownerID, detail.Version); err != nil {
		slog.WarnContext(ctx, "support_ticket_mark_seen_failed", "ticket_id", id, "user_id", ownerID, "version", detail.Version, "error", err)
	}
	return detail, nil
}

// Act checks the actor and transition, then writes the new state and history at the expected version.
func (s *SupportTicketService) Act(ctx context.Context, id, actorID int64, admin bool, input SupportTicketAction) (SupportTicket, error) {
	ownerID, role := actorID, "user"
	if admin {
		ownerID, role = 0, "admin"
	}
	ticket, err := s.repo.Get(ctx, id, ownerID)
	if err != nil {
		return SupportTicket{}, err
	}
	if input.Version < 1 {
		return SupportTicket{}, ErrSupportTicketInput
	}
	if input.Version != ticket.Version {
		return SupportTicket{}, ErrSupportTicketConflict
	}

	next := nextTicketStatus(ticket.Status, input.Action, admin)
	if next == "" {
		return SupportTicket{}, ErrSupportTicketAction
	}
	input.Body = strings.TrimSpace(input.Body)
	switch input.Action {
	case "confirm":
		if len(input.Images) > 0 {
			return SupportTicket{}, ErrSupportTicketInput
		}
		input.Body = ""
	case "close":
		// A closing note is optional.
		if input.Body != "" && !validTicketText(input.Body, 8000) {
			return SupportTicket{}, ErrSupportTicketInput
		}
	default:
		if !validTicketText(input.Body, 8000) {
			return SupportTicket{}, ErrSupportTicketInput
		}
	}

	if err := validateTicketImages(input.Images); err != nil {
		return SupportTicket{}, err
	}

	updated, err := s.repo.Apply(ctx, id, ownerID, actorID, role, next, input)
	if err == nil {
		slog.InfoContext(ctx, "support_ticket_action", "ticket_id", id, "actor_id", actorID, "action", input.Action,
			"from", ticket.Status, "to", updated.Status, "version", updated.Version, "image_count", len(input.Images))
	}
	return updated, err
}

// nextTicketStatus keeps resolution subject to confirmation by the requester, while either side may close
// an open ticket or reopen a closed one. Messages wait on the other side: a reopen by support waits for the requester.
func nextTicketStatus(status, action string, admin bool) string {
	switch status {
	case TicketWaitingSupport, TicketWaitingUser:
		switch {
		case action == "close":
			return TicketClosed
		case admin && action == "resolve":
			return TicketResolved
		case admin && action == "reply":
			return TicketWaitingUser
		case !admin && action == "reply":
			return TicketWaitingSupport
		}
	case TicketResolved:
		switch {
		case action == "close":
			return TicketClosed
		case !admin && action == "confirm":
			return TicketClosed
		case !admin && action == "reopen":
			return TicketWaitingSupport
		}
	case TicketClosed:
		switch {
		case admin && action == "reopen":
			return TicketWaitingUser
		case !admin && action == "reopen":
			return TicketWaitingSupport
		}
	}
	return ""
}

// SetKnowledge accepts separately authored Q&A for a closed ticket.
func (s *SupportTicketService) SetKnowledge(ctx context.Context, id, actorID int64, input SupportTicketKnowledgeUpdate) (SupportTicketKnowledge, error) {
	if input.Revision == nil || *input.Revision < 0 || input.Published == nil {
		return SupportTicketKnowledge{}, ErrSupportTicketInput
	}
	if *input.Published {
		input.Question, input.Answer = strings.TrimSpace(input.Question), strings.TrimSpace(input.Answer)
		if !validTicketText(input.Question, 300) || !validTicketText(input.Answer, 8000) {
			return SupportTicketKnowledge{}, ErrSupportTicketInput
		}
	} else {
		if *input.Revision == 0 {
			return SupportTicketKnowledge{}, ErrSupportTicketInput
		}
		input.Question, input.Answer = "", ""
	}

	ticket, err := s.repo.Get(ctx, id, 0)
	if err != nil {
		return SupportTicketKnowledge{}, err
	}
	if ticket.Status != TicketClosed {
		return SupportTicketKnowledge{}, ErrSupportTicketAction
	}
	item, err := s.repo.SetKnowledge(ctx, id, input)
	if err == nil {
		slog.InfoContext(ctx, "support_ticket_knowledge_updated", "ticket_id", id, "actor_id", actorID,
			"published", item.Published, "revision", item.Revision)
	}
	return item, err
}

func (s *SupportTicketService) ListKnowledge(ctx context.Context, after int64, limit int) ([]SupportTicketKnowledgeItem, error) {
	return s.repo.ListKnowledge(ctx, after, limit)
}

func validTicketText(value string, maxLength int) bool {
	return value != "" && !strings.ContainsRune(value, 0) && utf8.RuneCountInString(value) <= maxLength
}
