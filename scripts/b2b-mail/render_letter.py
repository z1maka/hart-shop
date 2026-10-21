"""Builds one B2B offer letter for Resend from the Claude Doc «Гарт · B2B ліди».

The outreach routine stores every letter in the doc's «Листи на погодження»
section, where the owner can edit it. This turns one of them into the email
Resend sends: the branded HTML (the shop's Ranger Green and khaki, logo, field
photo, product rows, catalogue button, seller's footer) and the plain-text
twin, so every letter looks the same whoever wrote it.

Usage: python3 -I scripts/b2b-mail/render_letter.py <doc-read.json> <№> <out.json>
<doc-read.json> is the Docs connector's `read` reply ({"data": {"xml": …}});
<out.json> gets {"subject", "html", "text"} for the Resend payload.
"""

import html
import json
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field

SITE_URL = "https://hart-shop.com"
LOGO_URL = f"{SITE_URL}/logo/hart-horizontal.png"
HERO_URL = f"{SITE_URL}/email/letter-hero.jpg"
CATALOGUE_HOST = "media.hart-shop.com/kp/"
SUBJECT_PREFIX = "Тема:"
SIGNATURE_START = "З повагою"
OPT_OUT_STARTS = ("Якщо такі листи", "Якщо пропозиція не актуальна")
SELLER_LINE = "ФОП Масний Олександр Сергійович · РНОКПП 3172012013 · вул. Авангардна, будинок 17, 23, м. Миколаїв, 54034"

INK = "#1f2a1f"
MUTED = "#4f5a4c"
ACCENT = "#3b4a3a"
ACCENT_FG = "#f1f3ea"
KHAKI = "#c8b07a"
KHAKI_INK = "#76623a"
CANVAS = "#eceee6"
SURFACE = "#f6f7f1"
LINE = "#d3d8cb"
FOOTER = "#172017"
ON_DARK_MUTED = "#aeb8a6"
DISPLAY_FONT = "'Oswald','Arial Narrow',Arial,sans-serif"
TEXT_FONT = "'Manrope',Arial,Helvetica,sans-serif"


@dataclass
class Run:
    text: str
    href: str | None = None
    is_break: bool = False


# The letter body in the doc's order: a paragraph is ("text", runs), the
# product list is ("products", [runs per item]).
Block = tuple[str, list]


@dataclass
class Letter:
    subject: str = ""
    blocks: list[Block] = field(default_factory=list)
    catalogue_url: str | None = None
    signature: list[Run] = field(default_factory=list)
    opt_out: str = ""


def runs_of(paragraph: ET.Element) -> list[Run]:
    runs: list[Run] = []
    for node in paragraph:
        if node.tag == "hardBreak":
            runs.append(Run("", is_break=True))
            continue
        link = node.find("link")
        if link is not None:
            runs.append(Run(link.text or "", href=link.get("href")))
        else:
            runs.append(Run("".join(node.itertext())))
    return runs


def plain(runs: list[Run]) -> str:
    return "".join("\n" if run.is_break else run.text for run in runs).strip()


def letter_blocks(root: ET.Element, number: str) -> list[ET.Element]:
    blocks = list(root)
    marker = f"№{number} ·"
    start = next(
        (i for i, block in enumerate(blocks)
         if block.get("heading") and plain(runs_of(block)).startswith(marker)),
        None,
    )
    if start is None:
        raise SystemExit(f"letter {marker} not found in the doc")
    tail = blocks[start + 1:]
    end = next((i for i, block in enumerate(tail) if block.get("heading")), len(tail))
    return tail[:end]


def add_paragraph(letter: Letter, runs: list[Run]) -> None:
    text = plain(runs)
    catalogue = next((run.href for run in runs if run.href and CATALOGUE_HOST in run.href), None)
    if text.startswith(SUBJECT_PREFIX):
        letter.subject = text[len(SUBJECT_PREFIX):].strip()
    elif catalogue:
        letter.catalogue_url = catalogue
    elif text.startswith(SIGNATURE_START):
        letter.signature = runs
    elif text.startswith(OPT_OUT_STARTS):
        letter.opt_out = text
    elif text:
        letter.blocks.append(("text", runs))


def parse_letter(xml: str, number: str) -> Letter:
    letter = Letter()
    for block in letter_blocks(ET.fromstring(xml), number):
        if block.tag == "paragraph":
            add_paragraph(letter, runs_of(block))
        elif block.tag == "list":
            letter.blocks.append(("products", [runs_of(p) for p in block.iter("paragraph")]))
    if not letter.subject:
        raise SystemExit(f"letter №{number} has no «{SUBJECT_PREFIX}» line")
    return letter


def inline_html(runs: list[Run], link_color: str = ACCENT) -> str:
    parts = []
    for run in runs:
        if run.is_break:
            parts.append("<br>")
        elif run.href:
            parts.append(
                f'<a href="{html.escape(run.href)}" style="color:{link_color};'
                f'font-weight:700;text-decoration:underline">{html.escape(run.text)}</a>'
            )
        else:
            parts.append(html.escape(run.text))
    return "".join(parts)


def product_parts(runs: list[Run]) -> tuple[str, str | None, str, str]:
    link = next((run for run in runs if run.href), None)
    name = link.text if link else plain(runs)
    rest = "".join(run.text for run in runs if run is not link and not run.is_break)
    rest = rest.strip().lstrip("—–-:").strip().rstrip(";.").strip()
    price, _, wholesale = rest.partition(", ")
    return name, link.href if link else None, price, wholesale


def product_row(runs: list[Run]) -> str:
    name, href, price, wholesale = product_parts(runs)
    title = (
        f'<a href="{html.escape(href)}" style="color:{INK};text-decoration:none">{html.escape(name)}</a>'
        if href else html.escape(name)
    )
    note = (
        f'<div style="font:400 13px/1.4 {TEXT_FONT};color:{MUTED};margin-top:2px">{html.escape(wholesale)}</div>'
        if wholesale else ""
    )
    return (
        f'<tr><td style="padding:12px 14px;border-bottom:1px solid {LINE}">'
        f'<div style="font:700 15px/1.35 {TEXT_FONT};color:{INK}">{title}</div>{note}</td>'
        f'<td align="right" style="padding:12px 14px;border-bottom:1px solid {LINE};white-space:nowrap;'
        f'font:600 16px/1.2 {DISPLAY_FONT};color:{KHAKI_INK}">{html.escape(price)}</td></tr>'
    )


def button(href: str, label: str, background: str, color: str) -> str:
    return (
        f'<a href="{html.escape(href)}" style="display:inline-block;background:{background};color:{color};'
        f'font:600 14px/1 {DISPLAY_FONT};letter-spacing:.06em;text-transform:uppercase;'
        f'text-decoration:none;padding:14px 22px;border-radius:6px;margin:0 8px 8px 0">{label}</a>'
    )


def block_html(block: Block) -> str:
    kind, content = block
    if kind == "products":
        return (
            f'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" '
            f'style="border:1px solid {LINE};border-bottom:0;background:{SURFACE};margin:4px 0 20px">'
            + "".join(product_row(runs) for runs in content) + "</table>"
        )
    return f'<p style="margin:0 0 14px;font:400 15px/1.6 {TEXT_FONT};color:{INK}">{inline_html(content)}</p>'


def body_html(letter: Letter) -> str:
    buttons = button(letter.catalogue_url, "Каталог з фото й цінами (PDF)", ACCENT, ACCENT_FG) if letter.catalogue_url else ""
    buttons += button(f"{SITE_URL}/", "Перейти на сайт", KHAKI, INK)
    signature = (
        f'<p style="margin:20px 0 0;font:400 14px/1.6 {TEXT_FONT};color:{MUTED}">{inline_html(letter.signature)}</p>'
    )
    body = "".join(block_html(block) for block in letter.blocks)
    return body + f'<div style="margin:4px 0 8px">{buttons}</div>' + signature


PREHEADER_LENGTH = 140


def preheader_of(letter: Letter) -> str:
    # The line inbox lists show after the subject: the reason we write, which
    # is the paragraph after the greeting.
    texts = [plain(content) for kind, content in letter.blocks if kind == "text"]
    return html.escape((texts[1] if len(texts) > 1 else texts[0])[:PREHEADER_LENGTH]) if texts else ""


def letter_html(letter: Letter) -> str:
    preheader = preheader_of(letter)
    return f"""<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&amp;family=Oswald:wght@600;700&amp;display=swap" rel="stylesheet"><title>{html.escape(letter.subject)}</title></head>
<body style="margin:0;padding:0;background:{CANVAS}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">{preheader}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:{CANVAS}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden">
<tr><td style="background:{INK};padding:22px 28px;border-bottom:3px solid {KHAKI}"><a href="{SITE_URL}/"><img src="{LOGO_URL}" width="180" height="42" alt="Гарт" style="display:block;border:0;width:180px;height:auto"></a></td></tr>
<tr><td><img src="{HERO_URL}" width="600" alt="Маскувальне пончо Гарт у посадці" style="display:block;border:0;width:100%;height:auto"></td></tr>
<tr><td style="padding:28px 28px 8px">
<h1 style="margin:0 0 18px;font:700 22px/1.25 {DISPLAY_FONT};letter-spacing:.02em;text-transform:uppercase;color:{INK}">{html.escape(letter.subject)}</h1>
{body_html(letter)}
</td></tr>
<tr><td style="padding:24px 28px 0"></td></tr>
<tr><td style="background:{FOOTER};padding:20px 28px;font:400 12px/1.6 {TEXT_FONT};color:{ON_DARK_MUTED}">
<div style="color:{KHAKI};font:600 13px/1.4 {DISPLAY_FONT};letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px">Гарт · власний цех у Миколаєві з 2014 року</div>
<div>{html.escape(SELLER_LINE)}</div>
<div style="margin-top:10px">{html.escape(letter.opt_out)}</div>
</td></tr></table></td></tr></table></body></html>"""


def run_text(run: Run) -> str:
    if run.is_break:
        return "\n"
    bare_href = (run.href or "").split("://", 1)[-1].rstrip("/")
    return f"{run.text} ({run.href})" if run.href and bare_href != run.text.rstrip("/") else run.text


def text_of(runs: list[Run]) -> str:
    return "".join(run_text(run) for run in runs).strip()


def block_text(block: Block) -> str:
    kind, content = block
    if kind == "products":
        return "\n".join(f"- {text_of(runs)}" for runs in content)
    return text_of(content)


def letter_text(letter: Letter) -> str:
    lines = [block_text(block) for block in letter.blocks]
    if letter.catalogue_url:
        lines.append(f"Повний каталог з фото й оптовими цінами: {letter.catalogue_url}")
    lines += [text_of(letter.signature), letter.opt_out]
    return "\n\n".join(line for line in lines if line)


def main() -> None:
    source, number, target = sys.argv[1:4]
    xml = json.load(open(source, encoding="utf-8"))["data"]["xml"]
    letter = parse_letter(xml, number)
    payload = {"subject": letter.subject, "html": letter_html(letter), "text": letter_text(letter)}
    json.dump(payload, open(target, "w", encoding="utf-8"), ensure_ascii=False)
    products = sum(len(content) for kind, content in letter.blocks if kind == "products")
    print(f"№{number}: {letter.subject} · {products} products")


main()
