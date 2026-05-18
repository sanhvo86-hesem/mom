# 90-Inbox — hash-archived chain-of-custody

Every inbound file from ASML (Ariba / email / secure transfer / portal) is
hash-archived on arrival. The hash + timestamp + sender becomes the chain-of-
custody record. Moves from 90-Inbox to 00-Customer-Source-IP require an
explicit rename-with-rev step that is audited.
