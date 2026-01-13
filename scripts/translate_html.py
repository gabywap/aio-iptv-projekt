#!/usr/bin/env python3
"""
scripts/translate_html.py
Translate visible text in HTML files using DeepL API and save translated copies.

Usage examples:
  # single file -> output file
  DEEPL_AUTH_KEY=your_key python3 scripts/translate_html.py --src index.html --out docs/hu/index.html --target HU

  # directory -> create parallel tree under docs/hu and docs/en
  DEEPL_AUTH_KEY=your_key python3 scripts/translate_html.py --dir . --out docs --langs HU EN

Notes:
 - The script preserves HTML structure and replaces only visible text nodes and common attributes (alt, title, aria-label).
 - For large sites it processes files one-by-one and sends batched text chunks to DeepL.
"""
import os
import sys
import argparse
import requests
import time
from bs4 import BeautifulSoup, Comment, NavigableString

DEEPL_URL = "https://api-free.deepl.com/v2/translate"  # or https://api.deepl.com/v2/translate for paid key
BATCH_SIZE = 40  # number of text segments per API call (tune if hitting limits)
SLEEP_BETWEEN_BATCHES = 0.5

def is_visible_text(node):
    if isinstance(node, Comment):
        return False
    parent = node.parent
    if not parent:
        return False
    if parent.name in ("script", "style", "code", "pre", "noscript"):
        return False
    text = str(node).strip()
    return bool(text)

def collect_text_nodes(soup):
    nodes = []
    for elem in soup.find_all(string=True):
        if isinstance(elem, NavigableString) and is_visible_text(elem):
            nodes.append(elem)
    return nodes

def collect_attr_items(soup, attrs=("alt", "title", "aria-label")):
    out = []
    for tag in soup.find_all(True):
        for a in attrs:
            if tag.has_attr(a) and tag[a].strip():
                out.append((tag, a, tag[a]))
    return out

def deepl_translate_texts(texts, target_lang, auth_key):
    if not texts:
        return []
    translated = []
    idx = 0
    n = len(texts)
    while idx < n:
        batch = texts[idx: idx + BATCH_SIZE]
        data = [("auth_key", auth_key), ("target_lang", target_lang)]
        for t in batch:
            data.append(("text", t))
        try:
            r = requests.post(DEEPL_URL, data=data, timeout=30)
            r.raise_for_status()
            j = r.json()
            for tr in j.get("translations", []):
                translated.append(tr.get("text", ""))
        except Exception as e:
            # basic retry/backoff
            print(f"[WARN] DeepL request failed: {e} — retrying after delay...", file=sys.stderr)
            time.sleep(3)
            try:
                r = requests.post(DEEPL_URL, data=data, timeout=30)
                r.raise_for_status()
                j = r.json()
                for tr in j.get("translations", []):
                    translated.append(tr.get("text", ""))
            except Exception as e2:
                print("[ERROR] Retry failed:", e2, file=sys.stderr)
                # fallback: return originals for remaining items
                for _ in batch:
                    translated.append("")  # keep empty so caller can decide
        idx += BATCH_SIZE
        time.sleep(SLEEP_BETWEEN_BATCHES)
    # ensure same length
    if len(translated) != len(texts):
        # pad with originals if mismatch
        for i in range(len(translated), len(texts)):
            translated.append(texts[i])
    return translated

def translate_file(src_path, out_path, target_lang, auth_key, translate_attrs=True):
    with open(src_path, "r", encoding="utf-8") as f:
        html = f.read()
    soup = BeautifulSoup(html, "html.parser")

    nodes = collect_text_nodes(soup)
    texts = [str(n) for n in nodes]

    if texts:
        translated_texts = deepl_translate_texts(texts, target_lang, auth_key)
        for node, new_text in zip(nodes, translated_texts):
            # avoid replacing with empty result
            if new_text is None or new_text == "":
                continue
            node.replace_with(new_text)

    if translate_attrs:
        attrs = collect_attr_items(soup)
        attr_texts = [a[2] for a in attrs]
        if attr_texts:
            translated_attrs = deepl_translate_texts(attr_texts, target_lang, auth_key)
            for (tag, attr, _), new_val in zip(attrs, translated_attrs):
                if new_val:
                    tag[attr] = new_val

    # Ensure output dir exists
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(str(soup))
    print(f"Saved translated file to: {out_path}")

def find_html_files(root_dir, exclude_dirs=(".", "node_modules", ".git")):
    out = []
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # skip hidden / excluded dirs
        if any(part.startswith(".") for part in os.path.relpath(dirpath, root_dir).split(os.sep) if part != "."):
            # allow root "." but skip nested hidden dirs
            pass
        # filter out common excluded dirs
        skip = False
        for d in exclude_dirs:
            if d != "." and d in dirpath:
                skip = True
        if skip:
            continue
        for fn in filenames:
            if fn.lower().endswith(".html") or fn.lower().endswith(".htm"):
                path = os.path.join(dirpath, fn)
                out.append(path)
    return out

def rel_dest(src, src_root, dest_root):
    # preserve relative path under dest_root
    rel = os.path.relpath(src, src_root)
    return os.path.join(dest_root, rel).replace("\\", "/")

def main():
    parser = argparse.ArgumentParser(description="Translate HTML files using DeepL.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--src", help="Source single HTML file")
    group.add_argument("--dir", help="Source directory to scan for HTML files")
    parser.add_argument("--out", required=True, help="Output file (for --src) or output dir (for --dir)")
    parser.add_argument("--target", help="Single target language (e.g. HU, EN)")
    parser.add_argument("--langs", nargs="+", help="Multiple target languages (e.g. HU EN)")
    parser.add_argument("--no-attrs", action="store_true", help="Don't translate alt/title attributes")
    args = parser.parse_args()

    auth_key = os.getenv("DEEPL_AUTH_KEY")
    if not auth_key:
        print("Set DEEPL_AUTH_KEY environment variable with your DeepL API key.", file=sys.stderr)
        sys.exit(1)

    translate_attrs = not args.no_attrs

    targets = []
    if args.langs:
        targets = [t.upper() for t in args.langs]
    elif args.target:
        targets = [args.target.upper()]
    else:
        print("Specify --target or --langs", file=sys.stderr)
        sys.exit(1)

    if args.src:
        for t in targets:
            translate_file(args.src, args.out.replace("{lang}", t.lower()) if "{lang}" in args.out else args.out, t, auth_key, translate_attrs)
    else:
        src_root = args.dir
        out_root = args.out
        html_files = find_html_files(src_root)
        for src in html_files:
            for t in targets:
                dest = rel_dest(src, src_root, os.path.join(out_root, t.lower()))
                translate_file(src, dest, t, auth_key, translate_attrs)

if __name__ == "__main__":
    main()
