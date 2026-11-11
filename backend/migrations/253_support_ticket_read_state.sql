-- The newest ticket version shown to the requester; a higher version means an unseen support update.
-- New tickets start at version 1, which the requester has seen because they wrote it.
ALTER TABLE support_tickets
    ADD COLUMN IF NOT EXISTS user_seen_version BIGINT NOT NULL DEFAULT 1;

-- Existing conversations start as read so the upgrade does not flag old replies.
UPDATE support_tickets SET user_seen_version = version WHERE user_seen_version <> version;
