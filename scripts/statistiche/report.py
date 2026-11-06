#!/usr/bin/env python3
"""Report mensile delle visite al sito, spedito per email alla casella del comitato.

I numeri vengono da Cloudflare Web Analytics, lo strumento di statistiche senza cookie che Cloudflare
aggiunge alle pagine del sito (è scritto nella pagina Privacy). Lo avvia il primo del mese
.github/workflows/report-visite.yml; si può avviare anche a mano, scegliendo il mese.

Variabili d'ambiente:
  CF_API_TOKEN    codice di Cloudflare con i permessi «Account Analytics: Read» e «Account Settings: Read»
  SMTP_USER       casella Aruba che spedisce (indirizzo completo)
  SMTP_PASSWORD   la sua password
  REPORT_MESE     facoltativa: il mese da raccontare, AAAA-MM (vuota = il mese appena finito)
  REPORT_A        facoltativa: il destinatario (vuota = info@comitatoacilianord.it)
  REPORT_PROVA    facoltativa: 1 = scrive il messaggio sullo schermo invece di spedirlo
Solo libreria standard di Python: niente da installare.
"""
import datetime as dt
import html
import json
import os
import re
import smtplib
import ssl
import sys
import urllib.error
import urllib.request
from email.message import EmailMessage
from email.utils import formataddr
from pathlib import Path
from zoneinfo import ZoneInfo

ROMA = ZoneInfo("Europe/Rome")
API = "https://api.cloudflare.com/client/v4"
DOMINIO = "comitatoacilianord.it"
SITO = "https://www.comitatoacilianord.it"
NOTIZIE = Path(__file__).resolve().parents[2] / "src" / "content" / "news"
MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre",
        "ottobre", "novembre", "dicembre"]
PAGINE = {"/": "La home", "/news/": "Le notizie", "/storia/": "La nostra storia", "/chi-siamo/": "Chi siamo",
          "/contatti/": "Contatti", "/partecipa/": "Partecipa", "/giornalino/": "Il giornalino",
          "/il-quartiere/": "Il quartiere", "/privacy/": "Privacy"}
DISPOSITIVI = {"mobile": "telefono", "desktop": "computer", "tablet": "tablet"}


# ---------------------------------------------------------------- Cloudflare
def chiama(percorso, corpo=None):
    req = urllib.request.Request(
        API + percorso, data=json.dumps(corpo).encode() if corpo is not None else None,
        headers={"Authorization": f"Bearer {os.environ['CF_API_TOKEN']}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            dati = json.load(r)
    except urllib.error.HTTPError as e:
        raise SystemExit(f"Cloudflare ha risposto {e.code} a {percorso}: {e.read().decode(errors='replace')[:500]}")
    if dati.get("errors"):
        raise SystemExit(f"Cloudflare ha risposto con un errore a {percorso}: {dati['errors']}")
    return dati


def trova_sito():
    """L'account e il sito di Web Analytics di comitatoacilianord.it (il codice vede solo i suoi account)."""
    for acc in chiama("/accounts?per_page=50")["result"]:
        for s in chiama(f"/accounts/{acc['id']}/rum/site_info/list?per_page=100")["result"]:
            host = [(s.get("ruleset") or {}).get("zone_name") or ""] + [r.get("host") or "" for r in s.get("rules") or []]
            if any(h == DOMINIO or h.endswith("." + DOMINIO) for h in host):
                return acc["id"], s["site_tag"]
    raise SystemExit("Su Cloudflare non c'è un sito di Web Analytics per comitatoacilianord.it")


def periodo(anno, mese):
    """Inizio e fine del mese a Roma, in UTC per Cloudflare."""
    a = dt.datetime(anno, mese, 1, tzinfo=ROMA)
    b = dt.datetime(anno + mese // 12, mese % 12 + 1, 1, tzinfo=ROMA)
    z = lambda x: x.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return z(a), z(b)


def numeri(account, sito, anno, mese):
    a, b = periodo(anno, mese)
    pa, pb = periodo(anno - (mese == 1), (mese - 2) % 12 + 1)
    f = f'{{siteTag: "{sito}", datetime_geq: "{a}", datetime_lt: "{b}"}}'
    fp = f'{{siteTag: "{sito}", datetime_geq: "{pa}", datetime_lt: "{pb}"}}'
    q = f"""{{ viewer {{ accounts(filter: {{accountTag: "{account}"}}) {{
      totale: rumPageloadEventsAdaptiveGroups(limit: 1, filter: {f}) {{ count sum {{ visits }} }}
      prima: rumPageloadEventsAdaptiveGroups(limit: 1, filter: {fp}) {{ count sum {{ visits }} }}
      pagine: rumPageloadEventsAdaptiveGroups(limit: 100, filter: {f}, orderBy: [count_DESC]) {{
        count dimensions {{ requestPath }} }}
      fonti: rumPageloadEventsAdaptiveGroups(limit: 100, filter: {f}, orderBy: [count_DESC]) {{
        count sum {{ visits }} dimensions {{ refererHost }} }}
      dispositivi: rumPageloadEventsAdaptiveGroups(limit: 10, filter: {f}, orderBy: [count_DESC]) {{
        count dimensions {{ deviceType }} }}
    }} }} }}"""
    acc = chiama("/graphql", {"query": q})["data"]["viewer"]["accounts"]
    if not acc:
        raise SystemExit("Il codice di Cloudflare non vede l'account (manca il permesso Account Analytics: Read?)")
    return acc[0]


# ---------------------------------------------------------------- parole
def titolo(percorso):
    p = percorso if percorso.endswith("/") else percorso + "/"
    if p in PAGINE:
        return PAGINE[p]
    if re.fullmatch(r"/news/pagina/\d+/", p):
        return "Le notizie, pagine successive"
    m = re.fullmatch(r"/news/([^/]+)/", p)
    if m and (NOTIZIE / f"{m.group(1)}.md").exists():
        t = re.search(r"^title:\s*(.+)$", (NOTIZIE / f"{m.group(1)}.md").read_text(), re.M)
        if t:
            return "Notizia: " + t.group(1).strip().strip("\"'")
    return percorso


def fonte(host):
    h = (host or "").lower()
    if not h:
        return "Link diretto (WhatsApp, preferiti, indirizzo scritto)"
    if h == DOMINIO or h.endswith("." + DOMINIO) or h.endswith(".workers.dev"):
        return None                                    # da una pagina all'altra del sito: non è una visita nuova
    if "facebook" in h or h == "fb.com":
        return "Facebook"
    if "instagram" in h:
        return "Instagram"
    if "whatsapp" in h:
        return "WhatsApp"
    if re.search(r"(^|\.)google\.", h):
        return "Google"
    if "bing." in h:
        return "Bing"
    return h


def n(x):
    return f"{round(x):,}".replace(",", ".")


def scrivi(dati, anno, mese):
    """Oggetto, testo semplice e HTML del messaggio."""
    tot = dati["totale"][0] if dati["totale"] else {"count": 0, "sum": {"visits": 0}}
    visite, viste = tot["sum"]["visits"], tot["count"]
    prima = dati["prima"][0]["sum"]["visits"] if dati["prima"] else 0
    nome_mese = f"{MESI[mese - 1]} {anno}"
    if prima:
        d = (visite - prima) / prima * 100
        confronto = f"{'+' if d >= 0 else '−'}{abs(d):.0f}% rispetto al mese prima, quando erano {n(prima)}"
    else:
        confronto = "primo mese con le statistiche"
    pagine = {}
    for r in dati["pagine"]:
        t = titolo(r["dimensions"]["requestPath"])
        pagine[t] = pagine.get(t, 0) + r["count"]
    fonti = {}
    for r in dati["fonti"]:
        nome = fonte(r["dimensions"]["refererHost"])
        if nome and r["sum"]["visits"]:
            fonti[nome] = fonti.get(nome, 0) + r["sum"]["visits"]
    disp = {}
    for r in dati["dispositivi"]:
        k = DISPOSITIVI.get(r["dimensions"]["deviceType"], "altro")
        disp[k] = disp.get(k, 0) + r["count"]
    top_pagine = sorted(pagine.items(), key=lambda x: -x[1])[:6]
    top_fonti = sorted(fonti.items(), key=lambda x: -x[1])[:5]
    tot_disp = sum(disp.values()) or 1
    quota = ", ".join(f"{k} {v / tot_disp * 100:.0f}%" for k, v in sorted(disp.items(), key=lambda x: -x[1]))

    oggetto = f"Il sito del comitato a {nome_mese}: {n(visite)} visite"
    righe = [f"Ciao! Ecco com'è andato {SITO.removeprefix('https://')} a {nome_mese}.", "",
             f"Visite: {n(visite)} ({confronto})", f"Pagine viste: {n(viste)}", ""]
    if top_pagine:
        righe += ["Le pagine più viste:"] + [f"  {i}. {t}: {n(v)}" for i, (t, v) in enumerate(top_pagine, 1)] + [""]
    if top_fonti:
        righe += ["Da dove arrivano le visite:"] + [f"  - {t}: {n(v)}" for t, v in top_fonti] + [""]
    if disp:
        righe += [f"Dispositivi: {quota}", ""]
    righe += ["I numeri sono di Cloudflare Web Analytics, che conta le visite in modo anonimo e senza cookie.",
              "Questo messaggio arriva da solo il primo di ogni mese."]
    testo = "\n".join(righe)

    e = html.escape
    li = lambda xs: "".join(f"<li>{e(t)}: <b>{n(v)}</b></li>" for t, v in xs)
    corpo = f"""<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#1d2530;max-width:560px">
<p>Ciao! Ecco com'è andato <a href="{SITO}">{e(SITO.removeprefix('https://'))}</a> a <b>{e(nome_mese)}</b>.</p>
<p style="font-size:22px;margin:18px 0 4px"><b>{n(visite)}</b> visite</p>
<p style="margin:0 0 4px;color:#555">{e(confronto)}</p>
<p style="margin:0 0 18px;color:#555">{n(viste)} pagine viste</p>
{f'<p style="margin-bottom:4px"><b>Le pagine più viste</b></p><ol style="margin-top:0">{li(top_pagine)}</ol>' if top_pagine else ''}
{f'<p style="margin-bottom:4px"><b>Da dove arrivano le visite</b></p><ul style="margin-top:0">{li(top_fonti)}</ul>' if top_fonti else ''}
{f'<p><b>Dispositivi:</b> {e(quota)}</p>' if disp else ''}
<p style="font-size:13px;color:#777;margin-top:24px">I numeri sono di Cloudflare Web Analytics, che conta le visite in modo
anonimo e senza cookie. Questo messaggio arriva da solo il primo di ogni mese.</p>
</div>"""
    return oggetto, testo, corpo


def spedisci(oggetto, testo, corpo):
    utente, a = os.environ["SMTP_USER"], os.environ.get("REPORT_A") or "info@comitatoacilianord.it"
    msg = EmailMessage()
    msg["Subject"], msg["From"], msg["To"] = oggetto, formataddr(("Sito del comitato", utente)), a
    msg.set_content(testo)
    msg.add_alternative(corpo, subtype="html")
    with smtplib.SMTP_SSL(os.environ.get("SMTP_HOST") or "smtps.aruba.it", int(os.environ.get("SMTP_PORT") or 465),
                          context=ssl.create_default_context(), timeout=60) as s:
        s.login(utente, os.environ["SMTP_PASSWORD"])
        s.send_message(msg)
    print(f"spedito a {a}: {oggetto}")


def main():
    scelto = (os.environ.get("REPORT_MESE") or "").strip()
    if scelto:
        if not re.fullmatch(r"\d{4}-\d{2}", scelto) or not 1 <= int(scelto[5:]) <= 12:
            raise SystemExit(f"Mese non valido: «{scelto}» (si scrive AAAA-MM, per esempio 2026-11)")
        anno, mese = int(scelto[:4]), int(scelto[5:])
    else:
        oggi = dt.datetime.now(ROMA)
        anno, mese = (oggi.year, oggi.month - 1) if oggi.month > 1 else (oggi.year - 1, 12)
    account, sito = trova_sito()
    oggetto, testo, corpo = scrivi(numeri(account, sito, anno, mese), anno, mese)
    if os.environ.get("REPORT_PROVA") == "1":
        print(oggetto, "\n", testo, sep="\n")
    else:
        spedisci(oggetto, testo, corpo)


if __name__ == "__main__":
    sys.exit(main())
