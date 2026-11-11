CREATE TABLE IF NOT EXISTS support_tickets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    create_key_hash CHAR(64) NOT NULL,
    subject VARCHAR(160) NOT NULL CHECK (char_length(subject) > 0),
    category VARCHAR(16) NOT NULL CHECK (category IN ('api', 'billing', 'account', 'other')),
    status VARCHAR(24) NOT NULL DEFAULT 'waiting_support'
        CHECK (status IN ('waiting_support', 'waiting_user', 'resolved', 'closed')),
    version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, create_key_hash)
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_recent ON support_tickets(updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_owner_recent ON support_tickets(user_id, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_recent ON support_tickets(status, updated_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS support_ticket_events (
    ticket_id BIGINT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    version BIGINT NOT NULL CHECK (version > 0),
    actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    actor_role VARCHAR(8) NOT NULL CHECK (actor_role IN ('user', 'admin')),
    action VARCHAR(12) NOT NULL CHECK (action IN ('create', 'reply', 'resolve', 'confirm', 'reopen')),
    body VARCHAR(8000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (ticket_id, version)
);

-- The reviewed text is stored independently of the private conversation.
CREATE TABLE IF NOT EXISTS support_ticket_knowledge (
    ticket_id BIGINT PRIMARY KEY REFERENCES support_tickets(id) ON DELETE CASCADE,
    revision BIGINT NOT NULL DEFAULT 1 CHECK (revision > 0),
    published BOOLEAN NOT NULL,
    question VARCHAR(300) NOT NULL,
    answer VARCHAR(8000) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        (published AND char_length(question) > 0 AND char_length(answer) > 0)
        OR (NOT published AND question = '' AND answer = '')
    )
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_knowledge_published
    ON support_ticket_knowledge(ticket_id) WHERE published;
