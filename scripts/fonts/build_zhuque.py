"""
Builds the 朱雀仿宋 (Zhuque Fangsong, SIL OFL 1.1, TrionesType) web font the site and the package
art use for inscriptions and title slips, straight from the font's Glyphs source:

    git clone --depth 1 https://github.com/TrionesType/zhuque
    python3 scripts/fonts/build_zhuque.py <path to zhuque>

It decomposes every glyph into a CFF outline, then slices the font by Unicode range (slicer.py)
so a page downloads only the slices for the characters it shows: public/fonts/zhuque/zq-NNN.woff2,
their @font-face rules in src/app/fonts.css, and the licence beside them. Needs fontTools; brotli
is optional (without it, Node's zlib compresses, see shim/brotli.py).
"""
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from slicer import slice_font, wanted  # noqa: E402

from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.fontBuilder import FontBuilder
from fontTools.misc.transform import Transform
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.transformPen import TransformPen
from io import BytesIO

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


def main(src):
    info, glyphs = load_glyphs(src)
    cmap = {}
    for name, g in glyphs.items():
        for u in g["unicodes"]:
            cmap.setdefault(u, name)
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

    rules = slice_font(full.getvalue(), FAMILY, OUT, "zq", "/fonts/zhuque/")
    (OUT / "OFL.txt").write_text((Path(src) / "LICENSE.txt").read_text("utf-8"), "utf-8")
    CSS.write_text(
        "/* 朱雀仿宋 Zhuque Fangsong (SIL OFL 1.1, TrionesType), sliced by Unicode range so a page loads only\n"
        "   the characters it shows. Generated by scripts/fonts/build_zhuque.py; do not edit by hand. */\n"
        + "\n".join(rules) + "\n",
        "utf-8",
    )


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.environ.get("ZHUQUE", "zhuque"))
