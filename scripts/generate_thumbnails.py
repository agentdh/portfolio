from __future__ import annotations

import json
import re
import shutil
from pathlib import Path
from urllib.parse import unquote

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "portfolio.json"
INDEX_PATH = ROOT / "index.html"
MAX_SIZE = (640, 480)
QUALITY = 78


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
    if (item.get("type") or "image") != "image":
        return None
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


def thumbnail_path(original: Path):
    return original.parent / "card-thumbs" / (original.stem + ".webp")


def build_thumbnail(original: Path, target: Path):
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(original) as image:
        try:
            image.seek(0)
        except EOFError:
            pass
        image = ImageOps.exif_transpose(image)
        image.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA" if "transparency" in image.info else "RGB")
        image.save(target, "WEBP", quality=QUALITY, method=6)


def update_payload(payload):
    made = reused = skipped = 0
    for item in portfolio_items(payload):
        original = source_path(item)
        if not original:
            skipped += 1
            continue
        target = thumbnail_path(original)
        if target.exists():
            reused += 1
        else:
            try:
                build_thumbnail(original, target)
                made += 1
            except Exception as error:
                print(f"skip {original.relative_to(ROOT)}: {error}")
                skipped += 1
                continue
        rel = target.relative_to(ROOT).as_posix()
        item["thumbnailPath"] = rel
        item["thumbnailSrc"] = "./" + rel
    return made, reused, skipped


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


def remove_legacy_thumbnail_dirs():
    for legacy_name in (".thumbnails", "_thumbnails"):
        for path in ROOT.rglob(legacy_name):
            if path.is_dir():
                shutil.rmtree(path)


def main():
    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    remove_legacy_thumbnail_dirs()
    made, reused, skipped = update_payload(payload)
    write_json(DATA_PATH, payload)
    update_embedded_payload(payload)
    print(f"generated={made} reused={reused} skipped={skipped}")


if __name__ == "__main__":
    main()
