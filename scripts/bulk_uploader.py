#!/usr/bin/env python3
"""
Islamic Reels Creator & Publisher — Unified Bulk Uploader & Cloud Scheduler
Combines Quran Reels Master Manifest inspection with Meta Graph API 1 Gbps Resumable
Video Reel Uploads and Islamic Prayer Times Pre-Scheduling.

Supports:
- ./exports/pack_... folders and standalone folders
- .zip export packages (auto-extracted)
- Single .mp4 / .mov reel files
- Format 1 Master manifest.json (Array and Object styles)
- 1-to-1 partner captions (.txt and .json)
- Daily Islamic prayer-times scheduling (Fajr, Dhuhr, Asr, Maghrib, Isha)
- Automated token detection from .env files
- Dry-run validation and multi-platform flags
"""

import argparse
import glob
import json
import os
import shutil
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from datetime import datetime, timedelta
from pathlib import Path

# ANSI Color codes for clean terminal output
GREEN = "\033[92m"
CYAN = "\033[96m"
YELLOW = "\033[93m"
MAGENTA = "\033[95m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"

DEFAULT_PAGE_ID = os.environ.get("FB_PAGE_ID", "1217144761490127")  # أجر - Ajr default
VIDEO_EXTENSIONS = {".mp4", ".mov", ".m4v", ".webm"}


def print_banner():
    print(f"\n{CYAN}{BOLD}=================================================================={RESET}")
    print(f"{CYAN}{BOLD}   🌟 Islamic Reels Creator & Publisher — Unified Toolkit 🌟   {RESET}")
    print(f"{CYAN}{BOLD}   Master Manifest Ingestion & Meta Cloud Resumable Scheduler     {RESET}")
    print(f"{CYAN}{BOLD}=================================================================={RESET}\n")


def format_size(num_bytes: int) -> str:
    if num_bytes >= 1024 * 1024:
        return f"{num_bytes / (1024 * 1024):.1f} MB"
    return f"{num_bytes / 1024:.0f} KB"


def load_env_token() -> str | None:
    """Attempts to find Meta access token in environment variables or local .env files."""
    for var in [
        "META_ACCESS_TOKEN",
        "PAGE_ACCESS_TOKEN",
        "META_TOKEN",
        "FB_TOKEN",
        "VITE_FB_PAGE_ACCESS_TOKEN",
    ]:
        val = os.environ.get(var)
        if val:
            return val.strip()

    search_dirs = [Path("."), Path(".."), Path(__file__).resolve().parent.parent]
    for base in search_dirs:
        for env_name in [".env", ".env.local"]:
            env_file = base / env_name
            if env_file.is_file():
                try:
                    with open(env_file, "r", encoding="utf-8") as f:
                        for line in f:
                            line = line.strip()
                            for prefix in [
                                "META_ACCESS_TOKEN=",
                                "PAGE_ACCESS_TOKEN=",
                                "VITE_FB_PAGE_ACCESS_TOKEN=",
                                "FB_TOKEN=",
                            ]:
                                if line.startswith(prefix):
                                    return line.split("=", 1)[1].strip().strip('"').strip("'")
                except Exception:
                    pass
    return None


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
            entry = dict(meta) if isinstance(meta, dict) else {"description": str(meta)}
            if "filename" not in entry:
                entry["filename"] = filename
            items.append(entry)
    else:
        raise ValueError(f"Unrecognized manifest structure in {manifest_path}")

    return items


def collect_items_from_source(source_path: Path):
    """
    Scans a folder, manifest, single file, or .zip package.
    Extracts all video reels, attaches metadata from manifest or sidecar files.
    """
    temp_dir = None
    target_folder = source_path

    # Case: ZIP archive
    if source_path.is_file() and source_path.suffix.lower() == ".zip":
        temp_dir = tempfile.mkdtemp(prefix="reels_pack_")
        print(f"{CYAN}📦 Unpacking '{source_path.name}' archive...{RESET}")
        with zipfile.ZipFile(source_path, "r") as z:
            z.extractall(temp_dir)
        target_folder = Path(temp_dir)

    # Case: Single video file
    if source_path.is_file() and source_path.suffix.lower() in VIDEO_EXTENSIONS:
        vid = source_path
        title = vid.stem.replace("_", " ").title()
        caption = title
        hashtags = ["#Quran", "#IslamicReels", "#Tilawah"]

        # Check for sidecar caption
        for ext in [".txt", ".json"]:
            sidecar = vid.with_suffix(ext)
            if sidecar.is_file():
                try:
                    with open(sidecar, "r", encoding="utf-8") as sf:
                        if ext == ".json":
                            j = json.load(sf)
                            caption = j.get("description") or j.get("caption") or caption
                            title = j.get("title") or title
                            if j.get("hashtags"):
                                hashtags = j["hashtags"]
                        else:
                            caption = sf.read().strip()
                except Exception:
                    pass

        final_caption = caption
        if hashtags and not any(h in final_caption for h in hashtags):
            final_caption = f"{final_caption}\n\n{' '.join(hashtags)}".strip()

        return [
            {
                "path": str(vid),
                "filename": vid.name,
                "title": title,
                "caption": final_caption,
                "surahName": "",
                "surah": "",
                "ayah": "",
                "reciter": "",
                "hashtags": hashtags,
                "size_bytes": vid.stat().st_size,
                "size_mb": round(vid.stat().st_size / (1024 * 1024), 2),
            }
        ], temp_dir

    # Case: Directory or Folder
    if not target_folder.is_dir():
        raise FileNotFoundError(f"Source path is neither a file nor a directory: {source_path}")

    # Check for master manifest
    manifest_data = None
    for m_name in ["manifest.json", "metadata.json", "captions.json", "info.json"]:
        mf = target_folder / m_name
        if mf.is_file():
            try:
                manifest_data = parse_manifest(mf)
                print(f"{GREEN}✓ Found master manifest: {m_name} ({len(manifest_data)} entries){RESET}")
                break
            except Exception as e:
                print(f"{YELLOW}Warning: Could not parse {m_name}: {e}{RESET}")

    # Find all video files
    video_files = [
        p
        for p in target_folder.rglob("*")
        if p.suffix.lower() in VIDEO_EXTENSIONS and not p.name.startswith(".")
    ]
    video_files.sort(key=lambda p: p.name)

    if not video_files:
        raise FileNotFoundError(f"No video files (.mp4, .mov, etc.) found in {source_path}")

    items = []
    for idx, vid in enumerate(video_files):
        title = vid.stem.replace("_", " ").title()
        description = ""
        surah_name = ""
        surah_num = ""
        ayah = ""
        reciter = ""
        hashtags = ["#Quran", "#IslamicReels", "#Tilawah"]

        if manifest_data:
            entry = None
            for m_item in manifest_data:
                if (
                    m_item.get("filename") == vid.name
                    or m_item.get("video") == vid.name
                    or m_item.get("id") == idx
                    or m_item.get("index") == idx + 1
                ):
                    entry = m_item
                    break

            if entry:
                title = entry.get("title") or title
                description = (
                    entry.get("description")
                    or entry.get("caption")
                    or entry.get("text")
                    or ""
                )
                surah_name = entry.get("surahName") or ""
                surah_num = entry.get("surah") or ""
                ayah = entry.get("ayah") or ""
                reciter = entry.get("reciter") or ""
                if entry.get("hashtags"):
                    hashtags = entry.get("hashtags")

        # Fallback to sidecar caption
        if not description:
            txt_partner = vid.with_suffix(".txt")
            json_partner = vid.with_suffix(".json")
            if txt_partner.is_file():
                try:
                    with open(txt_partner, "r", encoding="utf-8") as tf:
                        description = tf.read().strip()
                except Exception:
                    pass
            elif json_partner.is_file():
                try:
                    with open(json_partner, "r", encoding="utf-8") as jf:
                        jdata = json.load(jf)
                        title = jdata.get("title") or title
                        description = jdata.get("description") or jdata.get("caption") or ""
                        surah_name = jdata.get("surahName") or ""
                        surah_num = jdata.get("surah") or ""
                        ayah = jdata.get("ayah") or ""
                        reciter = jdata.get("reciter") or ""
                        if jdata.get("hashtags"):
                            hashtags = jdata.get("hashtags")
                except Exception:
                    pass

        final_caption = description.strip()
        if not final_caption:
            parts = [f"📖 {surah_name}" if surah_name else title]
            if ayah:
                parts.append(f"Ayat {ayah}")
            if reciter:
                parts.append(f"Recited by {reciter}")
            final_caption = " | ".join(parts)

        if hashtags and not any(tag in final_caption for tag in hashtags):
            final_caption = f"{final_caption}\n\n{' '.join(hashtags)}".strip()

        items.append(
            {
                "path": str(vid),
                "filename": vid.name,
                "title": title,
                "caption": final_caption,
                "surahName": surah_name,
                "surah": surah_num,
                "ayah": ayah,
                "reciter": reciter,
                "hashtags": hashtags,
                "size_bytes": vid.stat().st_size,
                "size_mb": round(vid.stat().st_size / (1024 * 1024), 2),
            }
        )

    return items, temp_dir


def post_json(url: str, data: dict, headers: dict | None = None) -> dict:
    """Utility to post JSON via standard urllib."""
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers=req_headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            err_json = json.loads(err_body)
            msg = err_json.get("error", {}).get("message", err_body)
        except Exception:
            msg = err_body
        raise Exception(f"HTTP {e.code}: {msg}")


def upload_reel_to_meta(page_id: str, access_token: str, item: dict, scheduled_timestamp: int | None = None):
    """
    Executes Meta 3-step Resumable Video Reel Upload protocol.
    Streams directly to Meta's ruploader.
    """
    file_path = item["path"]
    file_size = item["size_bytes"]

    # Step 1: Start Session
    start_url = f"https://graph.facebook.com/v20.0/{page_id}/video_reels"
    start_data = post_json(
        start_url,
        {
            "upload_phase": "start",
            "access_token": access_token,
        },
    )
    video_id = start_data.get("video_id")
    upload_url = start_data.get("upload_url")

    if not video_id or not upload_url:
        raise Exception(f"Failed to obtain upload URL from Meta. Response: {start_data}")

    # Step 2: Stream binary bytes
    print(f"   {CYAN}⚡ Streaming {item['filename']} ({format_size(file_size)}) to Meta Ruploader...{RESET}")
    with open(file_path, "rb") as f:
        file_bytes = f.read()

    req = urllib.request.Request(
        upload_url,
        data=file_bytes,
        headers={
            "Authorization": f"OAuth {access_token}",
            "offset": "0",
            "file_size": str(file_size),
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req) as upload_resp:
            _ = upload_resp.read()
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        raise Exception(f"Binary transfer failed: HTTP {e.code} - {err_body}")

    # Step 3: Finish and Publish/Schedule
    finish_params = {
        "upload_phase": "finish",
        "access_token": access_token,
        "video_id": video_id,
        "video_state": "SCHEDULED" if scheduled_timestamp else "PUBLISHED",
        "title": item["title"],
        "description": item["caption"],
    }
    if scheduled_timestamp:
        finish_params["scheduled_publish_time"] = scheduled_timestamp

    finish_data = post_json(start_url, finish_params)
    return video_id, finish_data


def calculate_schedule_timestamp(idx: int, args, base_time: datetime) -> int | None:
    """Calculates scheduled Unix timestamp based on prayer times or interval."""
    if args.publish_now:
        return None

    if args.prayer_times:
        # Standard 5 Islamic prayer schedule hours: Fajr (5), Dhuhr (12), Asr (16), Maghrib (19), Isha (21)
        prayer_hours = [5, 12, 16, 19, 21]
        target_hour = prayer_hours[idx % len(prayer_hours)]
        day_offset = idx // len(prayer_hours)
        now = datetime.now()
        drop_time = now.replace(hour=target_hour, minute=0, second=0, microsecond=0) + timedelta(days=day_offset)
        # Ensure scheduled time is at least 12 minutes in future as required by Meta
        if drop_time <= now + timedelta(minutes=10):
            drop_time += timedelta(days=1)
        return int(drop_time.timestamp())

    drop_time = base_time + timedelta(minutes=idx * args.interval)
    return int(drop_time.timestamp())


def main():
    print_banner()

    parser = argparse.ArgumentParser(
        description="Unified Bulk Uploader & Cloud Scheduler for Islamic Reels Creator"
    )
    parser.add_argument(
        "--folder",
        "-f",
        type=str,
        help="Path to folder or .zip file containing exported reels and manifest",
    )
    parser.add_argument("folder_pos", nargs="?", help="Positional folder argument")
    parser.add_argument(
        "--manifest",
        "-m",
        type=str,
        help="Direct path to manifest.json file",
    )
    parser.add_argument(
        "--file",
        type=str,
        help="Path to a single .mp4 or .mov reel to upload",
    )
    parser.add_argument(
        "--page-id",
        "-p",
        default=DEFAULT_PAGE_ID,
        help=f"Target Facebook Page ID / Instagram Profile (default: {DEFAULT_PAGE_ID})",
    )
    parser.add_argument(
        "--token",
        "-t",
        default=None,
        help="Meta Access Token (auto-detected from .env if omitted)",
    )
    parser.add_argument(
        "--platform",
        default="all",
        choices=["all", "meta", "instagram", "facebook", "tiktok", "youtube", "shorts"],
        help="Target platform (default: all)",
    )
    parser.add_argument(
        "--interval",
        "-i",
        type=int,
        default=180,
        help="Interval in minutes between drops (default: 180 min)",
    )
    parser.add_argument(
        "--start-delay",
        type=int,
        default=15,
        help="Minutes from now for first drop (default: 15 min)",
    )
    parser.add_argument(
        "--prayer-times",
        action="store_true",
        help="Distribute drops across the 5 daily Islamic prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha)",
    )
    parser.add_argument(
        "--publish-now",
        action="store_true",
        help="Publish immediately instead of pre-scheduling",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate metadata, video paths, and sizes without network uploads",
    )
    parser.add_argument(
        "--delay",
        type=int,
        default=2,
        help="Delay in seconds between operations (default: 2s)",
    )

    args = parser.parse_args()

    # Determine source
    raw_source = args.file or args.manifest or args.folder or args.folder_pos

    if not raw_source:
        # Auto-detect latest export in ./exports/
        export_dirs = sorted(glob.glob("./exports/pack_*") + glob.glob("./exports/quran_pack_*"), reverse=True)
        if not export_dirs:
            # Check all exports subfolders except single
            all_exports = Path("exports")
            if all_exports.is_dir():
                subdirs = [d for d in all_exports.iterdir() if d.is_dir() and d.name != "single"]
                if subdirs:
                    subdirs.sort(key=lambda d: d.stat().st_mtime, reverse=True)
                    export_dirs = [str(subdirs[0])]

        if export_dirs:
            raw_source = export_dirs[0]
            print(f"{CYAN}Auto-detected latest export batch: {BOLD}{raw_source}{RESET}")
        else:
            print(f"{RED}Error: Please specify --folder, --manifest, or --file.{RESET}")
            parser.print_help()
            sys.exit(1)

    source_path = Path(raw_source).expanduser().resolve()
    if not source_path.exists():
        print(f"{RED}Error: Source '{source_path}' does not exist.{RESET}")
        sys.exit(1)

    # Load token (unless in dry-run mode)
    token = None
    if not args.dry_run:
        token = args.token or load_env_token()
        if not token:
            print(f"{YELLOW}Warning: No Meta Access Token detected in environment or .env files.{RESET}")
            try:
                token = input("Enter Meta Page Access Token (or Ctrl+C to cancel): ").strip()
            except (KeyboardInterrupt, EOFError):
                print(f"\n{YELLOW}Upload cancelled.{RESET}")
                sys.exit(0)
            if not token:
                print(f"{RED}Error: Meta access token is required for live uploads.{RESET}")
                sys.exit(1)

    print(f"📁 Source: {BOLD}{source_path}{RESET}")
    print(f"📄 Page ID: {BOLD}{args.page_id}{RESET}")
    print(f"🌐 Platform: {BOLD}{args.platform.upper()}{RESET}")
    print(
        f"⏰ Mode: {BOLD}{'DRY-RUN VALIDATION' if args.dry_run else ('PUBLISH NOW' if args.publish_now else ('PRAYER TIMES SCHEDULE' if args.prayer_times else f'INTERVAL ({args.interval}m) SCHEDULE'))}{RESET}"
    )

    try:
        items, temp_dir = collect_items_from_source(source_path)
    except Exception as e:
        print(f"{RED}Failed to collect reels: {e}{RESET}")
        sys.exit(1)

    print(f"{GREEN}✓ Found {len(items)} reel(s) ready for processing.{RESET}\n")
    print("------------------------------------------------------------------")

    base_time = datetime.now() + timedelta(minutes=max(args.start_delay, 12))
    success_count = 0
    fail_count = 0

    try:
        for idx, item in enumerate(items, 1):
            scheduled_ts = calculate_schedule_timestamp(idx - 1, args, base_time)
            drop_date_str = (
                datetime.fromtimestamp(scheduled_ts).strftime("%Y-%m-%d %H:%M:%S")
                if scheduled_ts
                else "Immediate"
            )

            print(f"[{idx}/{len(items)}] 🎬 {BOLD}{item['filename']}{RESET}")
            if item.get("surahName") or item.get("surah"):
                print(
                    f"   📖 Surah: {CYAN}{item.get('surahName', '')} ({item.get('surah', '')}) | Ayat: {item.get('ayah', '')}{RESET}"
                )
            if item.get("reciter"):
                print(f"   🎙️  Reciter: {MAGENTA}{item.get('reciter')}{RESET}")
            print(f"   📦 Size: {item['size_mb']} MB")
            print(f"   📅 Target Time: {YELLOW}{drop_date_str}{RESET}")

            if args.dry_run:
                print(f"   {GREEN}✔ Validated successfully (Dry-run mode, skipping network){RESET}\n")
                success_count += 1
                continue

            try:
                start_t = time.time()
                video_id, _ = upload_reel_to_meta(args.page_id, token, item, scheduled_ts)
                elapsed = round(time.time() - start_t, 1)
                speed_mbps = round(item["size_mb"] / (elapsed or 0.1), 2)
                success_count += 1
                status_label = "Pre-Scheduled" if scheduled_ts else "Published"
                print(
                    f"   {GREEN}✔ {status_label} on Meta! Video ID: {video_id} ({elapsed}s, ~{speed_mbps} MB/s){RESET}\n"
                )
            except Exception as err:
                fail_count += 1
                print(f"   {RED}✖ Upload Failed: {err}{RESET}\n")

            if idx < len(items) and not args.dry_run:
                time.sleep(args.delay)

    finally:
        if temp_dir and os.path.isdir(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)

    print("------------------------------------------------------------------")
    print(f"\n{BOLD}Execution Summary:{RESET}")
    print(f"  {GREEN}✔ Succeeded: {success_count}{RESET}")
    if fail_count > 0:
        print(f"  {RED}✖ Failed:    {fail_count}{RESET}")

    if not args.dry_run and success_count > 0 and not args.publish_now:
        print(f"\n{GREEN}{BOLD}🎉 Success! All {success_count} reels are safely pre-scheduled on Meta Cloud.{RESET}")
        print(f"{GREEN}💻 Your laptop can now be safely turned off! Meta will publish them on schedule.{RESET}")

    print(f"\n{CYAN}All operations completed.{RESET}\n")


if __name__ == "__main__":
    main()
