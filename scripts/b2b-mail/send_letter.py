"""Sends one B2B offer letter built by render_letter.py through Resend.

The outreach routine runs in the cloud, where every free-form request to an
outside service is checked before it runs; a fixed command it may run on its
own keeps the sending predictable. The sender, reply-to, BCC copy and the
unsubscribe header are fixed here, so a run can only choose the recipient and
the letter it rendered. The idempotency key makes a repeated call for the same
row and address a no-op on Resend's side.

Usage: python3 -I scripts/b2b-mail/send_letter.py <№> <email> <letter.json>
<letter.json> is render_letter.py's output ({"subject", "html", "text"}). The
key is read from RESEND_API_KEY and never printed. Prints «№n → <email>: <HTTP
code>» and Resend's error message on failure; exits 0 only when Resend accepted
the letter.
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request

RESEND_URL = "https://api.resend.com/emails"
SENDER = "Гарт <office@hart-shop.com>"
REPLY_TO = "office@hart-shop.com"
UNSUBSCRIBE = "<mailto:office@hart-shop.com?subject=unsubscribe>"
USER_AGENT = "hart-b2b-mail/1.0"
TIMEOUT_SECONDS = 30
EMAIL = re.compile(r"^[^@\s,;<>]+@[^@\s,;<>]+\.[^@\s,;<>]+$")
LETTER_FIELDS = ("subject", "html", "text")
EXIT_REFUSED = 1
EXIT_NOT_CONFIGURED = 2


def read_letter(path: str) -> dict:
    letter = json.load(open(path, encoding="utf-8"))
    missing = [field for field in LETTER_FIELDS if not letter.get(field)]
    if missing:
        raise SystemExit(f"{path} has no {', '.join(missing)}: render the letter first")
    return letter


def payload_of(email: str, letter: dict) -> bytes:
    return json.dumps(
        {
            "from": SENDER,
            "to": [email],
            "reply_to": REPLY_TO,
            "bcc": [REPLY_TO],
            "subject": letter["subject"],
            "html": letter["html"],
            "text": letter["text"],
            "headers": {"List-Unsubscribe": UNSUBSCRIBE},
        },
        ensure_ascii=False,
    ).encode("utf-8")


def send(number: str, email: str, letter: dict, api_key: str) -> tuple[int, str]:
    request = urllib.request.Request(
        RESEND_URL,
        data=payload_of(email, letter),
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Idempotency-Key": f"hart-b2b-{number}-{email}",
            "User-Agent": USER_AGENT,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            return response.status, ""
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", "replace")
        try:
            return error.code, json.loads(body).get("message", body)
        except ValueError:
            return error.code, body
    except urllib.error.URLError as error:
        # No answer at all: reported as code 0, so the row stays queued.
        return 0, str(error.reason)


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    number, email, letter_path = sys.argv[1:]
    if not number.isdigit() or not EMAIL.match(email):
        raise SystemExit(f"not a row number and an email: {number} {email}")
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key:
        print(f"№{number} → {email}: RESEND_API_KEY is not set")
        sys.exit(EXIT_NOT_CONFIGURED)

    status, error = send(number, email, read_letter(letter_path), api_key)
    print(f"№{number} → {email}: {status}" + (f" {error}" if error else ""))
    if not 200 <= status < 300:
        sys.exit(EXIT_REFUSED)


main()
