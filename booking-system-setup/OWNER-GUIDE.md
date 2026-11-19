# Managing appointments at Velquince Studio

I set this calendar up for one chair. Both services use that same chair, so a consultation also blocks a conflicting cut.

## Set availability

Open **WordPress → Appointments**. Set the opening and closing times, tick the working days, and add closed dates in `YYYY-MM-DD` form, separated by commas. Choose **Save availability**. New availability takes effect when the next customer requests times; a booking already saved stays on the list.

The starting hours are Monday to Friday, 09:00–17:00, in Europe/London. The run includes a closed date on 2 April 2027. A cut and finish takes 60 minutes plus a 15-minute gap; a style consultation takes 30 minutes plus a 10-minute gap. The entire appointment and its gap must fit before closing. Available starts are spaced 15 minutes apart.

Customers need at least 12 hours' notice and can book up to 365 days ahead. These rules are enforced again when the customer confirms, so an old browser tab cannot take a time that has since been booked. London automatically changes between GMT and BST. The browser's timezone does not change the studio's appointment time.

Service names, durations, buffers and the notice/horizon rules are maintained in `src/velquince-booking.php`. Opening hours and closures are editable on the owner screen. This case does not include staff calendars, payments, reminders or customer self-service cancellation.

## Find and manage a booking

The Appointments screen lists the reference, service, guest, studio time, status and mail status. Match the reference with the confirmation. I preserve the service name, time and customer details in the booking record; changing working hours does not rewrite a saved appointment.

Mail marked `sent` means the SMTP server accepted it. In this run, I also inspect the received message in the local catcher. If mail fails, the customer still sees the saved appointment and reference with an explicit mail warning, and the owner's list shows `failed`. Confirm delivery separately when connecting a real mail provider.

## Cancel and rebook

Choose **Cancel appointment** on the correct row. The row changes to `cancelled`, a cancellation message is sent, and the time is released immediately. The cancelled record stays visible for reference. Repeating a cancellation does not send a second message.

A replacement can take the released slot only if it still meets the current working hours, closures, service duration, buffer and minimum-notice rules. There is no separate owner cancellation cutoff. The [recorded check](proof/after-flow.json) cancels VQ-1, books its time again, and verifies that a further booking cannot take it.

## Before using this setup elsewhere

Use real time by removing `BOOKING_CLOCK` from the runtime configuration. The proof runner deliberately fixes the date so that clock-change checks remain repeatable. Set the intended business timezone, availability and service rules before taking bookings. Use a working SMTP provider and verify a real recipient; the included mail catcher only stores local messages.

The source is designed for one resource and MariaDB/MySQL named locks. If the database cannot grant the lock, it returns a busy response rather than accepting an unprotected booking. A host using SQLite needs a different locking implementation.
