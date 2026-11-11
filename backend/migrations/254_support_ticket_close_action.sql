-- Either side may close an open ticket, and either side may reopen a closed one.
ALTER TABLE support_ticket_events DROP CONSTRAINT IF EXISTS support_ticket_events_action_check;
ALTER TABLE support_ticket_events ADD CONSTRAINT support_ticket_events_action_check
    CHECK (action IN ('create', 'reply', 'resolve', 'confirm', 'reopen', 'close'));
