from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path
from urllib.parse import unquote

from PIL import Image, ImageOps
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "portfolio.json"
INDEX_PATH = ROOT / "index.html"
MAX_SIZE = (640, 480)
QUALITY = 78
VIDEO_SIZE = (640, 360)


def portfolio_items(payload):
    portfolio = payload.get("portfolio", payload)
    if not isinstance(portfolio, dict):
        return
    for items in portfolio.values():
        if not isinstance(items, list):
            continue
        for item in items:
            if isinstance(item, dict):
                yield item


def source_path(item):
    src = str(item.get("src") or item.get("url") or "")
    if not src or src.startswith(("http://", "https://", "data:", "blob:")):
        return None
    clean = unquote(src.split("?", 1)[0]).lstrip("./")
    path = (ROOT / clean).resolve()
    try:
        path.relative_to(ROOT)
    except ValueError:
        return None
    return path if path.is_file() else None


def thumbnail_path(original: Path, media_type: str):
    suffix = ".jpg" if media_type == "video" else ".webp"
    return original.parent / "card-thumbs" / (original.stem + suffix)


def build_image_thumbnail(original: Path, target: Path):
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(original) as image:
        image = ImageOps.exif_transpose(image)
        image.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA" if "transparency" in image.info else "RGB")
        image.save(target, "WEBP", quality=QUALITY, method=6)


def build_video_thumbnail(original: Path, target: Path):
    target.parent.mkdir(parents=True, exist_ok=True)
    width, height = VIDEO_SIZE
    vf = (
        f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
        f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=0x090a12"
    )
    subprocess.run(
        [
            imageio_ffmpeg.get_ffmpeg_exe(),
            "-y",
            "-ss",
            "0.5",
            "-i",
            str(original),
            "-frames:v",
            "1",
            "-vf",
            vf,
            "-q:v",
            "3",
            str(target),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )


def clear_thumbnail_metadata(item):
    item.pop("thumbnailPath", None)
    item.pop("thumbnailSrc", None)
    item.pop("thumbnailUrl", None)


def update_payload(payload):
    made = skipped = animated = 0
    for item in portfolio_items(payload):
        media_type = item.get("type") or "image"
        original = source_path(item)

        # GIF는 원본 파일을 카드에 직접 표시해 애니메이션을 유지한다.
        if media_type == "image" and original and original.suffix.lower() == ".gif":
            clear_thumbnail_metadata(item)
            animated += 1
            continue

        if media_type not in ("image", "video") or not original:
            skipped += 1
            continue

        target = thumbnail_path(original, media_type)
        try:
            if media_type == "video":
                build_video_thumbnail(original, target)
            else:
                build_image_thumbnail(original, target)
            made += 1
        except Exception as error:
            print(f"skip {original.relative_to(ROOT)}: {error}")
            clear_thumbnail_metadata(item)
            skipped += 1
            continue

        rel = target.relative_to(ROOT).as_posix()
        item["thumbnailPath"] = rel
        item["thumbnailSrc"] = "./" + rel
        item.pop("thumbnailUrl", None)
    return made, skipped, animated


def write_json(path: Path, payload):
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def update_embedded_payload(payload):
    html = INDEX_PATH.read_text(encoding="utf-8")
    pattern = re.compile(
        r'(<script[^>]*id=["\']portfolio-data["\'][^>]*>)([\s\S]*?)(</script>)',
        re.IGNORECASE,
    )
    encoded = json.dumps(payload, ensure_ascii=False, indent=2).replace("</script>", "<\\/script>")
    updated, count = pattern.subn(lambda match: match.group(1) + encoded + match.group(3), html, count=1)
    if count != 1:
        raise RuntimeError("portfolio-data script not found")
    INDEX_PATH.write_text(updated, encoding="utf-8")


def reset_thumbnail_dirs():
    for name in (".thumbnails", "_thumbnails", "card-thumbs"):
        for path in ROOT.rglob(name):
            if path.is_dir():
                shutil.rmtree(path)


def main():
    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    reset_thumbnail_dirs()
    made, skipped, animated = update_payload(payload)
    write_json(DATA_PATH, payload)
    update_embedded_payload(payload)
    print(f"generated={made} animated_gif={animated} skipped={skipped}")


if __name__ == "__main__":
    main()
