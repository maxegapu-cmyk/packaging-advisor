"""
Slices a font into small WOFF2 files by Unicode range, the way web font services do, so a page
downloads only the slices for the characters it shows. Shared by build_zhuque.py and
add_shoujin.py.

Order: Latin and punctuation first; then the hanzi this app's own text uses, most used first (a
page's headings come from a few slices); then the rest of GB 2312 in its order; then the rest.
"""
import sys
from collections import Counter
from io import BytesIO
from pathlib import Path

try:
    import brotli  # noqa: F401
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent / "shim"))

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]


def gb2312():
    """GB 2312's hanzi in its own order: level 1 (common, by pinyin), then level 2."""
    one, two = [], []
    for hi in range(0xB0, 0xF8):
        for lo in range(0xA1, 0xFF):
            try:
                c = bytes([hi, lo]).decode("gb2312")
            except UnicodeDecodeError:
                continue
            (one if hi < 0xD8 else two).append(ord(c))
    return one, two


def ranges(cps):
    cps = sorted(set(cps))
    out = []
    start = prev = cps[0]
    for c in cps[1:]:
        if c == prev + 1:
            prev = c
            continue
        out.append((start, prev))
        start = prev = c
    out.append((start, prev))
    return ", ".join(f"U+{a:X}" if a == b else f"U+{a:X}-{b:X}" for a, b in out)


def wanted(u):
    """What a web slice set carries: Latin and punctuation, CJK symbols and full-width forms, hanzi."""
    return 0x20 <= u <= 0x7E or 0xA0 <= u <= 0x17F or 0x2000 <= u <= 0x206F or 0x3000 <= u <= 0x303F or 0xFF00 <= u <= 0xFFEF or 0x3400 <= u <= 0x9FFF or 0xF900 <= u <= 0xFAFF


def slice_font(data, family, out, prefix, url, css_path=None, hinting=True):
    """
    Writes out/<prefix>-NNN.woff2 and returns their @font-face rules (url(...) = url + file name).
    Writes the rules to css_path too when given.
    """
    have = {u for u in TTFont(BytesIO(data)).getBestCmap() if wanted(u)}
    one, two = gb2312()
    base = [u for u in have if u < 0x3400 or 0xFF00 <= u <= 0xFFEF]
    used = Counter()
    for f in list((ROOT / "src").rglob("*.ts")) + list((ROOT / "src").rglob("*.tsx")):
        used.update(ord(ch) for ch in f.read_text("utf-8") if 0x3400 <= ord(ch) <= 0x9FFF)
    own = [u for u, _ in used.most_common() if u in have]
    taken = set(base) | set(own)
    slices = [sorted(base)]
    for group, size in ((own, 60), ([u for u in one if u not in taken], 80), ([u for u in two if u not in taken], 100), (sorted(u for u in have if u not in taken | set(one) | set(two)), 160)):
        g = [u for u in group if u in have]
        slices += [g[i:i + size] for i in range(0, len(g), size)]
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    for f in out.glob(f"{prefix}-*.woff2"):
        f.unlink()
    rules = []
    total = 0
    for i, cps in enumerate(s for s in slices if s):
        font = TTFont(BytesIO(data))
        opts = Options()
        opts.flavor = "woff2"
        opts.layout_features = ["vert", "vrt2"]
        opts.notdef_outline = True
        opts.name_IDs = ["*"]
        opts.name_languages = ["*"]
        opts.hinting = hinting
        opts.drop_tables += ["FFTM"]
        sub = Subsetter(opts)
        sub.populate(unicodes=cps)
        sub.subset(font)
        name = f"{prefix}-{i:03d}.woff2"
        font.flavor = "woff2"
        font.save(out / name)
        total += (out / name).stat().st_size
        rules.append(f'@font-face {{ font-family: "{family}"; font-style: normal; font-weight: 400; font-display: swap; src: url("{url}{name}") format("woff2"); unicode-range: {ranges(cps)}; }}')
    print(f"{family}: {len(rules)} slices, {round(total / 1e6, 2)} MB")
    if css_path:
        Path(css_path).write_text("\n".join(rules) + "\n", "utf-8")
    return rules
