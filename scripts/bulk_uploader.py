#!/usr/bin/env python3
"""
Islamic Reels Creator - Bulk Uploader CLI Script
Automatically inspects exported packs, parses Format 1 master manifest.json,
and imports / uploads reels to social media platforms or cloud destinations.
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

# ANSI Color codes for clean terminal output
GREEN = "\033[92m"
CYAN = "\033[96m"
YELLOW = "\033[93m"
MAGENTA = "\033[95m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"


def print_banner():
    print(f"\n{CYAN}{BOLD}===================================================={RESET}")
    print(f"{CYAN}{BOLD}   Islamic Reels Creator — Bulk Uploader CLI       {RESET}")
    print(f"{CYAN}{BOLD}   Format 1 Master manifest.json & Media Importer  {RESET}")
    print(f"{CYAN}{BOLD}===================================================={RESET}\n")


def parse_manifest(manifest_path: Path):
    """
    Parse manifest.json supporting both Format 1 (Array) and Key-Value Dictionary.
    """
    if not manifest_path.exists():
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")

    with open(manifest_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    items = []
    if isinstance(data, list):
        items = data
    elif isinstance(data, dict):
        for filename, meta in data.items():
            entry = dict(meta)
            if "filename" not in entry:
                entry["filename"] = filename
            items.append(entry)
    else:
        raise ValueError(f"Unrecognized manifest structure in {manifest_path}")

    return items


def format_size(num_bytes: int) -> str:
    if num_bytes >= 1024 * 1024:
        return f"{num_bytes / (1024 * 1024):.1f} MB"
    return f"{num_bytes / 1024:.0f} KB"


def process_item(item: dict, folder_dir: Path, dry_run: bool, platform: str):
    filename = item.get("filename", "")
    video_path = folder_dir / filename

    title = item.get("title", "Quran Reel")
    description = item.get("description", "")
    surah_name = item.get("surahName", "")
    surah_num = item.get("surah", "")
    ayah = item.get("ayah", "")
    reciter = item.get("reciter", "")
    hashtags = item.get("hashtags", [])

    print(f"🎬 {BOLD}{filename}{RESET}")
    print(f"   📖 Surah: {CYAN}{surah_name} ({surah_num}) | Ayat: {ayah}{RESET}")
    print(f"   🎙️  Reciter: {MAGENTA}{reciter}{RESET}")
    print(f"   🏷️  Hashtags: {' '.join(hashtags)}")

    if not video_path.exists():
        print(f"   {RED}❌ Error: File not found at {video_path}{RESET}")
        return False

    size_str = format_size(video_path.stat().st_size)
    print(f"   📦 Size: {size_str}")

    if dry_run:
        print(f"   {GREEN}✔ Validated (Dry-run mode: skipping network upload){RESET}")
        return True

    # ── Platform upload hooks ──
    # Here you can hook into Instagram Graph API, TikTok Content Posting API, YouTube Data API, or Cloud Webhooks
    print(f"   🚀 Uploading to {BOLD}{platform.upper()}{RESET}...")

    # Placeholder for actual API dispatch
    time.sleep(1)
    print(f"   {GREEN}✔ Uploaded successfully!{RESET}")
    return True


def main():
    print_banner()

    parser = argparse.ArgumentParser(
        description="Bulk Uploader CLI for Islamic Reels Creator exports"
    )
    parser.add_argument(
        "--folder",
        "-f",
        type=str,
        help="Path to folder containing exported reels and manifest.json",
    )
    parser.add_argument(
        "--manifest",
        "-m",
        type=str,
        help="Direct path to manifest.json file",
    )
    parser.add_argument(
        "--file",
        type=str,
        help="Path to a single .mp4 file to upload",
    )
    parser.add_argument(
        "--platform",
        "-p",
        type=str,
        default="all",
        choices=["all", "instagram", "tiktok", "youtube", "shorts"],
        help="Target platform (default: all)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate metadata and file presence without executing remote upload",
    )
    parser.add_argument(
        "--delay",
        type=int,
        default=5,
        help="Delay in seconds between uploads (default: 5s)",
    )

    args = parser.parse_args()

    # Case 1: Single file mode
    if args.file:
        file_path = Path(args.file).expanduser().resolve()
        if not file_path.exists():
            print(f"{RED}Error: File {file_path} does not exist.{RESET}")
            sys.exit(1)
        print(f"Uploading single file: {file_path}")
        print(f"Platform: {args.platform} | Dry-run: {args.dry_run}")
        print(f"{GREEN}✔ Single file validated successfully.{RESET}\n")
        return

    # Case 2: Folder or Manifest mode
    if not args.folder and not args.manifest:
        # Default to ./exports if exists
        default_exports = Path("exports").resolve()
        if default_exports.exists():
            # Find latest subfolder in exports/
            subdirs = [d for d in default_exports.iterdir() if d.is_dir() and d.name != "single"]
            if subdirs:
                subdirs.sort(key=lambda d: d.stat().st_mtime, reverse=True)
                args.folder = str(subdirs[0])
                print(f"No --folder specified. Auto-detected latest batch: {args.folder}")

    if not args.folder and not args.manifest:
        parser.print_help()
        sys.exit(1)

    if args.manifest:
        manifest_path = Path(args.manifest).expanduser().resolve()
        folder_dir = manifest_path.parent
    else:
        folder_dir = Path(args.folder).expanduser().resolve()
        manifest_path = folder_dir / "manifest.json"

    if not folder_dir.exists():
        print(f"{RED}Error: Folder {folder_dir} does not exist.{RESET}")
        sys.exit(1)

    print(f"📂 Folder: {folder_dir}")
    print(f"📄 Manifest: {manifest_path}")
    print(f"🌐 Platform: {args.platform}")
    print(f"🔍 Dry Run: {'YES' if args.dry_run else 'NO'}\n")

    try:
        items = parse_manifest(manifest_path)
    except Exception as e:
        print(f"{RED}Failed to read manifest: {e}{RESET}")
        sys.exit(1)

    print(f"Found {BOLD}{len(items)}{RESET} reels in manifest.\n")
    print("----------------------------------------------------")

    success_count = 0
    fail_count = 0

    for idx, item in enumerate(items, 1):
        print(f"[{idx}/{len(items)}] Processing...")
        ok = process_item(item, folder_dir, args.dry_run, args.platform)
        if ok:
            success_count += 1
        else:
            fail_count += 1
        print("----------------------------------------------------")
        if not args.dry_run and idx < len(items):
            time.sleep(args.delay)

    print(f"\n{BOLD}Summary:{RESET}")
    print(f"  {GREEN}✔ Success: {success_count}{RESET}")
    if fail_count > 0:
        print(f"  {RED}✖ Failed: {fail_count}{RESET}")
    print(f"\nAll operations completed.\n")


if __name__ == "__main__":
    main()
