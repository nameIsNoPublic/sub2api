CREATE TABLE IF NOT EXISTS support_ticket_images (
    ticket_id BIGINT NOT NULL,
    event_version BIGINT NOT NULL,
    position SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 3),
    content_type VARCHAR(16) NOT NULL CHECK (content_type IN ('image/png', 'image/jpeg', 'image/webp')),
    data BYTEA NOT NULL CHECK (octet_length(data) BETWEEN 1 AND 5242880),
    PRIMARY KEY (ticket_id, event_version, position),
    FOREIGN KEY (ticket_id, event_version) REFERENCES support_ticket_events(ticket_id, version) ON DELETE CASCADE
);
