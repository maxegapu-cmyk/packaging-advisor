"""
Builds the 朱雀仿宋 (Zhuque Fangsong, SIL OFL 1.1, TrionesType) web font the site and the package
art use for inscriptions and title slips, straight from the font's Glyphs source:

    git clone --depth 1 https://github.com/TrionesType/zhuque
    python3 scripts/fonts/build_zhuque.py <path to zhuque>

It decomposes every glyph into a CFF outline, then slices the font into small WOFF2 files by
Unicode range, the way web font services do, so a page downloads only the slices for the
characters it shows: public/fonts/zhuque/zq-NN.woff2, their @font-face rules in
src/app/fonts.css, and the licence beside them. Needs fontTools; brotli is optional (without it,
Node's zlib compresses, see shim/brotli.py).
"""
import os
import re
import sys
from collections import Counter
from pathlib import Path

try:
    import brotli  # noqa: F401
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent / "shim"))

from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.fontBuilder import FontBuilder
from fontTools.misc.transform import Transform
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.transformPen import TransformPen
from fontTools.subset import Options, Subsetter
from io import BytesIO
from fontTools.ttLib import TTFont

FAMILY = "Zhuque Fangsong"
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "fonts" / "zhuque"
CSS = ROOT / "src" / "app" / "fonts.css"

# ------------------------------------------------------------------ the Glyphs file format

TOKEN = re.compile(r'\s*(?:(?P<p>[{}()=;,])|"(?P<q>(?:[^"\\]|\\.)*)"|(?P<w>[^\s{}()=;,"]+))', re.S)


def parse(text):
    """An OpenStep-style property list, as Glyphs 3 writes it."""
    toks = []
    pos = 0
    while True:
        m = TOKEN.match(text, pos)
        if not m or m.end() == pos:
            break
        pos = m.end()
        if m.group("p"):
            toks.append(("p", m.group("p")))
        elif m.group("q") is not None:
            toks.append(("s", m.group("q").encode().decode("unicode_escape") if "\\" in m.group("q") else m.group("q")))
        else:
            toks.append(("w", m.group("w")))
    i = 0

    def value():
        nonlocal i
        kind, v = toks[i]
        if kind == "p" and v == "{":
            i += 1
            d = {}
            while toks[i] != ("p", "}"):
                key = toks[i][1]
                i += 2  # key =
                d[key] = value()
                i += 1  # ;
            i += 1
            return d
        if kind == "p" and v == "(":
            i += 1
            arr = []
            while toks[i] != ("p", ")"):
                arr.append(value())
                if toks[i] == ("p", ","):
                    i += 1
            i += 1
            return arr
        i += 1
        if kind == "w":
            try:
                return int(v)
            except ValueError:
                try:
                    return float(v)
                except ValueError:
                    return v
        return v

    return value()


def load_glyphs(src):
    pkg = Path(src) / "src" / "ZhuqueFangsong.glyphspackage"
    info = parse((pkg / "fontinfo.plist").read_text("utf-8"))
    master = info["fontMaster"][0]["id"]
    glyphs = {}
    for f in (pkg / "glyphs").glob("*.glyph"):
        g = parse(f.read_text("utf-8"))
        if g.get("export") == 0:
            continue
        layer = next((l for l in g.get("layers", []) if l.get("layerId") == master), None)
        if layer is None:
            continue
        uni = g.get("unicode")
        unis = [] if uni is None else (uni if isinstance(uni, list) else [uni])
        glyphs[g["glyphname"]] = {"unicodes": [int(u) for u in unis], "layer": layer}
    return info, glyphs


# ------------------------------------------------------------------ outlines

def draw(glyphs, name, pen, depth=0):
    """Draws a glyph's paths and its components (decomposed) to a segment pen."""
    layer = glyphs[name]["layer"]
    for shape in layer.get("shapes", []):
        if "ref" in shape:
            if shape["ref"] not in glyphs or depth > 8:
                continue
            x, y = shape.get("pos", (0, 0))
            sx, sy = shape.get("scale", (1, 1))
            t = Transform().translate(x, y).rotate(shape.get("angle", 0) * 3.141592653589793 / 180).scale(sx, sy)
            draw(glyphs, shape["ref"], TransformPen(pen, t), depth + 1)
            continue
        nodes = [(float(n[0]), float(n[1]), str(n[2])) for n in shape.get("nodes", [])]
        if len(nodes) < 2 or not shape.get("closed", 1):
            continue
        # a closed path starts at its last node
        nodes = [nodes[-1]] + nodes[:-1]
        if nodes[0][2].startswith("o"):
            # rotate to an on-curve point
            k = next((j for j, n in enumerate(nodes) if not n[2].startswith("o")), None)
            if k is None:
                continue
            nodes = nodes[k:] + nodes[:k]
        pen.moveTo(nodes[0][:2])
        offs = []
        for x, y, t in nodes[1:] + [nodes[0]]:
            if t.startswith("o"):
                offs.append((x, y))
            elif t.startswith("c"):
                if len(offs) == 2:
                    pen.curveTo(offs[0], offs[1], (x, y))
                elif len(offs) == 1:
                    pen.qCurveTo(offs[0], (x, y))
                else:
                    pen.lineTo((x, y))
                offs = []
            elif t.startswith("q"):
                pen.qCurveTo(*offs, (x, y))
                offs = []
            else:
                pen.lineTo((x, y))
                offs = []
        pen.closePath()


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


def main(src):
    info, glyphs = load_glyphs(src)
    cmap = {}
    for name, g in glyphs.items():
        for u in g["unicodes"]:
            cmap.setdefault(u, name)
    # what the web font carries: Latin and punctuation, CJK symbols and full-width forms, every hanzi
    def wanted(u):
        return 0x20 <= u <= 0x7E or 0xA0 <= u <= 0x17F or 0x2000 <= u <= 0x206F or 0x3000 <= u <= 0x303F or 0xFF00 <= u <= 0xFFEF or 0x3400 <= u <= 0x9FFF or 0xF900 <= u <= 0xFAFF
    cmap = {u: n for u, n in cmap.items() if wanted(u)}
    # vertical forms of punctuation (。，「」 set upright in a column), for the vert feature
    verts = {n: n + ".vert" for n in set(cmap.values()) if n + ".vert" in glyphs}
    order = [".notdef"] + sorted(set(cmap.values()) | set(verts.values()))
    charstrings = {}
    advances = {}
    lsb = {}
    for name in order:
        width = 1000
        rec = RecordingPen()
        if name != ".notdef":
            width = int(round(glyphs[name]["layer"].get("width", 1000)))
            draw(glyphs, name, rec)
        pen = T2CharStringPen(width, None)
        rec.replay(pen)
        bp = BoundsPen(None)
        rec.replay(bp)
        charstrings[name] = pen.getCharString()
        advances[name] = width
        lsb[name] = int(bp.bounds[0]) if bp.bounds else 0
    fb = FontBuilder(1000, isTTF=False)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupCFF("ZhuqueFangsong-Regular", {"FullName": "Zhuque Fangsong Regular", "FamilyName": FAMILY, "Weight": "Regular"}, charstrings, {})
    fb.setupHorizontalMetrics({n: (advances[n], lsb[n]) for n in order})
    fb.setupHorizontalHeader(ascent=880, descent=-120)
    fb.setupNameTable({
        "familyName": FAMILY,
        "styleName": "Regular",
        "copyright": "Copyright 2023 JadeFoci; © 2025 TrionesType. Licensed under the SIL Open Font License 1.1.",
        "licenseDescription": "This Font Software is licensed under the SIL Open Font License, Version 1.1.",
        "licenseInfoURL": "https://openfontlicense.org",
        "version": f"Version {info.get('versionMajor', 0)}.{info.get('versionMinor', 0):03d}; web subset",
    })
    fb.setupOS2(sTypoAscender=880, sTypoDescender=-120, sTypoLineGap=0, usWinAscent=1000, usWinDescent=250, achVendID="TRNS", fsType=0)
    fb.setupPost()
    if verts:
        subs = "\n".join(f"  sub {a} by {b};" for a, b in sorted(verts.items()))
        addOpenTypeFeaturesFromString(fb.font, f"languagesystem DFLT dflt;\nlanguagesystem hani dflt;\nfeature vert {{\n{subs}\n}} vert;\nfeature vrt2 {{\n{subs}\n}} vrt2;\n")
    full = BytesIO()
    fb.font.save(full)
    print("full font:", len(order), "glyphs,", len(verts), "vertical forms,", round(len(full.getvalue()) / 1e6, 2), "MB")

    # slices: Latin and punctuation; then the hanzi this app's own text uses, most used first, so a
    # page's headings come from a few slices; then the rest of GB 2312 in its order; then the rest
    have = set(cmap)
    one, two = gb2312()
    base = [u for u in have if u < 0x3400 or 0xFF00 <= u <= 0xFFEF]
    used = Counter()
    for f in list((ROOT / "src").rglob("*.ts")) + list((ROOT / "src").rglob("*.tsx")):
        used.update(ord(ch) for ch in f.read_text("utf-8") if 0x3400 <= ord(ch) <= 0x9FFF)
    own = [u for u, _ in used.most_common() if u in have]
    taken = set(base) | set(own)
    slices = [base]
    for group, size in ((own, 60), ([u for u in one if u not in taken], 80), ([u for u in two if u not in taken], 100), (sorted(u for u in have if u not in taken | set(one) | set(two)), 160)):
        g = [u for u in group if u in have]
        slices += [g[i:i + size] for i in range(0, len(g), size)]
    OUT.mkdir(parents=True, exist_ok=True)
    for f in OUT.glob("zq-*.woff2"):
        f.unlink()
    rules = []
    total = 0
    for i, cps in enumerate(slices):
        font = TTFont(BytesIO(full.getvalue()))
        opts = Options()
        opts.flavor = "woff2"
        opts.layout_features = ["vert", "vrt2"]
        opts.notdef_outline = True
        opts.name_IDs = ["*"]
        opts.name_languages = ["*"]
        opts.drop_tables += ["FFTM"]
        sub = Subsetter(opts)
        sub.populate(unicodes=cps)
        sub.subset(font)
        name = f"zq-{i:03d}.woff2"
        font.flavor = "woff2"
        font.save(OUT / name)
        total += (OUT / name).stat().st_size
        rules.append(f'@font-face {{ font-family: "{FAMILY}"; font-style: normal; font-weight: 400; font-display: swap; src: url("/fonts/zhuque/{name}") format("woff2"); unicode-range: {ranges(cps)}; }}')
    print("slices:", len(slices), "total", round(total / 1e6, 2), "MB")
    (OUT / "OFL.txt").write_text((Path(src) / "LICENSE.txt").read_text("utf-8"), "utf-8")
    CSS.write_text(
        "/* 朱雀仿宋 Zhuque Fangsong (SIL OFL 1.1, TrionesType), sliced by Unicode range so a page loads only\n"
        "   the characters it shows. Generated by scripts/fonts/build_zhuque.py; do not edit by hand. */\n"
        + "\n".join(rules) + "\n",
        "utf-8",
    )


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.environ.get("ZHUQUE", "zhuque"))
