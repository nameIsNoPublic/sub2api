package service

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestNextTicketStatus(t *testing.T) {
	open := []string{TicketWaitingSupport, TicketWaitingUser}
	cases := []struct {
		from   []string
		action string
		admin  bool
		want   string
	}{
		{open, "reply", false, TicketWaitingSupport},
		{open, "reply", true, TicketWaitingUser},
		{open, "resolve", true, TicketResolved},
		{open, "resolve", false, ""},
		{open, "confirm", false, ""},
		{open, "reopen", false, ""},
		// Either side may close an open ticket.
		{open, "close", false, TicketClosed},
		{open, "close", true, TicketClosed},
		{[]string{TicketResolved}, "close", false, TicketClosed},
		{[]string{TicketResolved}, "close", true, TicketClosed},
		{[]string{TicketResolved}, "confirm", false, TicketClosed},
		{[]string{TicketResolved}, "confirm", true, ""},
		{[]string{TicketResolved}, "reopen", false, TicketWaitingSupport},
		{[]string{TicketResolved}, "reopen", true, ""},
		{[]string{TicketResolved}, "reply", true, ""},
		// A closed ticket accepts only a reopen, which waits on the other side.
		{[]string{TicketClosed}, "reopen", false, TicketWaitingSupport},
		{[]string{TicketClosed}, "reopen", true, TicketWaitingUser},
		{[]string{TicketClosed}, "close", false, ""},
		{[]string{TicketClosed}, "close", true, ""},
		{[]string{TicketClosed}, "reply", false, ""},
		{[]string{TicketClosed}, "reply", true, ""},
	}
	for _, tc := range cases {
		for _, from := range tc.from {
			require.Equal(t, tc.want, nextTicketStatus(from, tc.action, tc.admin), "%s --%s(admin=%v)-->", from, tc.action, tc.admin)
		}
	}
}
