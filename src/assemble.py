"""Builds index.html from the source parts. Escapes all non-ASCII so the page never shows mojibake."""
import re, pathlib, sys

SRC = pathlib.Path(__file__).parent
OUT = SRC.parent
LOGO = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else None

def esc_markup(s):
    return "".join(c if ord(c) < 128 else "&#%d;" % ord(c) for c in s)

def esc_script(s):
    out = []
    for c in s:
        o = ord(c)
        if o < 128:
            out.append(c)
        elif o > 0xFFFF:
            o -= 0x10000
            out.append("\\u%04x\\u%04x" % (0xD800 + (o >> 10), 0xDC00 + (o & 0x3FF)))
        else:
            out.append("\\u%04x" % o)
    return "".join(out)

logo = LOGO.read_text() if LOGO else ""
logo = re.sub(r'\s(width|height)="\d+"', "", logo, count=2)
logo = logo.replace('fill="black"', 'fill="currentColor"').strip()
logo = re.sub(r">\s+<", "><", logo)

css = (SRC / "_style.css").read_text()
body = (SRC / "_body.html").read_text().replace("__LOGO__", logo)
js = "\n".join((SRC / f).read_text() for f in ["_data.js", "_engine.js", "_ui.js"])

page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="fal CPG Studio: one pack sketch to a global campaign, running live on fal.">
<title>fal CPG Studio</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400..750&display=swap">
<style>
{esc_markup(css)}
</style>
</head>
<body>
{esc_markup(body)}
<script>
(function(){{
{esc_script(js)}
}})();
</script>
</body>
</html>
"""
(OUT / "index.html").write_text(page)
assert all(ord(c) < 128 for c in page), "non-ASCII left in page"
print("index.html", len(page), "bytes")
