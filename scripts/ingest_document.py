#!/usr/bin/env python3
"""
Local Moodle Document Ingestion CLI for Coach Partiels (INSA Rennes ESET 3A).
Usage:
  python scripts/ingest_document.py path/to/course_or_td.pdf [--hint "Ajoute un DS blanc"]

Requires GEMINI_API_KEY in environment and `pip install google-genai`.
Automatically classifies which of the 8 ESET 3A subjects the document belongs to,
generates/improves subject-adapted interactive exercises (bode, signal, pipeline,
cloze, fsm, circ, chrono, asm, cmd, mat, grid, nums, qcm), and merges them directly
into public/coach-data/{ds,allq,memo}.json.
"""

import argparse
import base64
import json
import mimetypes
import os
import re
import sys
import time
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "public" / "coach-data"

SUBJECTS = {
    "c": ("Langage C", ["es", "tab", "ptr", "st", "en"]),
    "m": ("Maths", ["esp", "app", "mat", "det", "inv", "bas", "pol", "vp"]),
    "e": ("ELEN numérique", ["c1", "c2", "c3", "c4", "c5", "c6", "c7"]),
    "p": ("Prog syst", ["c1", "c2", "c3", "c4", "c5"]),
    "r": ("Architecture des processeurs", ["c1", "c2", "c3", "c4"]),
    "a": ("Électronique analogique", ["c1", "c2", "c3", "c4", "c5", "c6"]),
    "t": ("Traitement du signal (TTSD)", ["c1", "c2", "c3", "c4", "c5", "c6"]),
    "g": ("Anglais", ["c1", "c2", "c3", "c4"]),
}


def extract_office_text(path: Path) -> str:
    ext = path.suffix.lower().lstrip(".")
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        if ext == "docx" and "word/document.xml" in names:
            xml = z.read("word/document.xml").decode("utf-8", errors="ignore")
            return re.sub(r"<[^>]+>", " ", xml)
        if ext in ("odt", "odp", "ods") and "content.xml" in names:
            xml = z.read("content.xml").decode("utf-8", errors="ignore")
            return re.sub(r"<[^>]+>", " ", xml)
        if ext == "pptx":
            slides = sorted(n for n in names if re.match(r"ppt/slides/slide\d+\.xml$", n))
            return "\n".join(re.sub(r"<[^>]+>", " ", z.read(s).decode("utf-8", errors="ignore")) for s in slides)
        if ext == "xlsx" and "xl/sharedStrings.xml" in names:
            ns = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
            ss_root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            return "\n".join("".join(t.text or "" for t in si.findall(".//a:t", ns)) for si in ss_root.findall("a:si", ns))
    return ""


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest a Moodle document into Coach Partiels ESET 3A.")
    parser.add_argument("file", type=Path, help="Path to PDF, DOCX, ODT, XLSX, PPTX, TXT, or image")
    parser.add_argument("--hint", default="", help="Optional guidance for Gemini")
    args = parser.parse_args()

    if not args.file.exists():
        sys.exit(f"File not found: {args.file}")
    if not os.environ.get("GEMINI_API_KEY"):
        sys.exit("Please set GEMINI_API_KEY in your environment.")

    from google import genai  # type: ignore

    client = genai.Client()
    mime, _ = mimetypes.guess_type(str(args.file))
    ext = args.file.suffix.lower().lstrip(".")
    mime = mime or ("application/pdf" if ext == "pdf" else "text/plain")

    prompt = (
        f"Analyse le document '{args.file.name}' pour Coach Partiels (INSA Rennes ESET 3A).\n"
        f"Matières possibles: {json.dumps(SUBJECTS, ensure_ascii=False)}.\n"
        f"{('Consigne: ' + args.hint) if args.hint else ''}\n"
        "Identifie subject_key, doc_type, action_summary, et génère au format JSON strict : "
        "{subject_key, doc_type, action_summary, ds_module (avec interfaces adaptées bode/signal/pipeline/cloze/grid/nums/asm/cmd/qcm), "
        "quiz_questions, memo_update}."
    )

    input_parts = [{"type": "text", "text": prompt}]
    if ext == "pdf" or mime.startswith("image/"):
        b64 = base64.b64encode(args.file.read_bytes()).decode("ascii")
        kind = "image" if mime.startswith("image/") else "document"
        input_parts.append({"type": kind, "data": b64, "mime_type": mime})
    elif ext in ("docx", "odt", "xlsx", "pptx"):
        input_parts.append({"type": "text", "text": extract_office_text(args.file)[:120_000]})
    else:
        input_parts.append({"type": "text", "text": args.file.read_text(encoding="utf-8", errors="ignore")[:120_000]})

    interaction = client.interactions.create(
        model="gemini-4-hydrogen",
        input=input_parts,
        response_mime_type="application/json",
        store=False,
    )
    raw = (interaction.output_text or "").strip()
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw)
    result = json.loads(raw)

    subj = result.get("subject_key", "c")
    if subj not in SUBJECTS:
        subj = "c"
    uid = hex(int(time.time()))[2:]
    print(f"Detected subject: {SUBJECTS[subj][0]} ({subj}) — {result.get('action_summary', '')}")

    ds_path = DATA_DIR / "ds.json"
    allq_path = DATA_DIR / "allq.json"
    memo_path = DATA_DIR / "memo.json"
    ds = json.loads(ds_path.read_text(encoding="utf-8"))
    allq = json.loads(allq_path.read_text(encoding="utf-8"))
    memo = json.loads(memo_path.read_text(encoding="utf-8"))

    if result.get("ds_module") and subj != "c":
        dsm = result["ds_module"]
        dsm["id"] = f"cli_{subj}_{uid}"
        dsm["s"] = subj
        dsm["th"] = dsm.get("module_type", "theme") == "theme"
        dsm["ann"] = dsm.get("module_type") == "annale"
        ds.append(dsm)
        ds_path.write_text(json.dumps(ds, ensure_ascii=False), encoding="utf-8")
        print(f"Added DS/Theme module: {dsm.get('title')}")

    if result.get("quiz_questions"):
        for idx, q in enumerate(result["quiz_questions"]):
            q["id"] = f"cliq_{subj}_{uid}_{idx}"
            q["s"] = subj
            allq.append(q)
        allq_path.write_text(json.dumps(allq, ensure_ascii=False), encoding="utf-8")
        print(f"Added {len(result['quiz_questions'])} quiz question(s)")

    if result.get("memo_update") and result["memo_update"].get("pts"):
        mu = result["memo_update"]
        memo.setdefault(subj, []).append([f"clim_{subj}_{uid}", mu.get("title", args.file.stem), mu["pts"]])
        memo_path.write_text(json.dumps(memo, ensure_ascii=False), encoding="utf-8")
        print(f"Added memo chapter: {mu.get('title')}")


if __name__ == "__main__":
    main()
