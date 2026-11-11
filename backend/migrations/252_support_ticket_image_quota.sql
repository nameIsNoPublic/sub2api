-- Keep quota scans on image metadata rather than the binary payloads.
ALTER TABLE support_ticket_images
    ADD COLUMN IF NOT EXISTS byte_size INTEGER GENERATED ALWAYS AS (octet_length(data)) STORED;
