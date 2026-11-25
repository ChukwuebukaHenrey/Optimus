"""
Captions for the film from the owner's ElevenLabs take (brief §1 accessibility).

Finds the take's pauses with FFmpeg, aligns the script's phrases (docs/video/VO_SCRIPT_ELEVENLABS.md)
to the speech between them by syllable length (blocks never share a segment), then writes one cue per
sentence (long ones split at commas, two lines of <= 42 characters, >= 1 s on screen) at the time each
block plays in the film (out/vo-placements.json, written by `npm run audio`).

    python scripts/vo-captions.py            (run from video/, after `npm run audio`)
Prints each block's span in the take, which is how VO_TAKE.blocks in src/config.ts was measured.
"""
import json, os, re, subprocess, sys

ROOT = os.getcwd()
FFDIR = os.environ.get("OPTIMUS_FFMPEG_DIR", r"C:\Users\ADMIN\tools\ffmpeg\ffmpeg-9.1-essentials_build\bin")
FF = os.path.join(FFDIR, "ffmpeg.exe")
TAKE = os.path.join(ROOT, "public", "audio", "vo", "vo-take.mp3")
SCRIPT = os.path.join(ROOT, "..", "docs", "video", "VO_SCRIPT_ELEVENLABS.md")
PLACE = os.path.join(ROOT, "out", "vo-placements.json")
OUT = os.path.join(ROOT, "out", "optimus-demo.srt")

log = subprocess.run([FF, "-hide_banner", "-i", TAKE, "-af", "silencedetect=noise=-40dB:d=0.2", "-f", "null", "-"], capture_output=True, text=True).stderr
sil = [float(x) for x in re.findall(r"silence_(?:start|end): ([0-9.]+)", log)]
total = float(re.search(r"Duration: (\d+):(\d+):([\d.]+)", log).expand(r"\1")) * 3600 + float(re.search(r"Duration: \d+:(\d+)", log).group(1)) * 60 + float(re.search(r"Duration: \d+:\d+:([\d.]+)", log).group(1))
segs, t = [], 0.0
for a, b in zip(sil[0::2], sil[1::2]):
    if a - t > 0.05: segs.append((t, a))
    t = b
if total - t > 0.05: segs.append((t, total))

doc = open(SCRIPT, encoding="utf-8").read()
blocks = re.findall(r"\*\*(VO-[0-9a-f]+)\*\*\s*```\n(.*?)\n```", doc, re.S)
def syl(w):
    w = w.lower()
    if w == "c.l.i.": return 3
    if w == "a.i.": return 2
    n = len(re.findall(r"[aeiouy]+", w))
    if w.endswith("e") and n > 1 and not w.endswith("le"): n -= 1
    return max(1, n)
WORD = r"[A-Za-z0-9][A-Za-z0-9'.\-]*"
phr = []
for bid, b in blocks:
    txt = re.sub(r"\[[^\]]*\]", "", re.sub(r"\[(short pause|pause)\]", "|", b))
    for p in re.split(r"\.\.\.|…|\||(?<=[a-z0-9\"])[.,:?!]\s|(?<=[a-z])[.,:?!]$", txt):
        ws = re.findall(WORD, p)
        if ws: phr.append((bid, sum(syl(w) for w in ws), len(ws)))

n, m = len(phr), len(segs)
rate = sum(b - a for a, b in segs) / sum(p[1] for p in phr)
INF = 1e18
dp = [[INF] * (m + 1) for _ in range(n + 1)]; bk = [[None] * (m + 1) for _ in range(n + 1)]; dp[0][0] = 0
for i in range(n + 1):
    for j in range(m + 1):
        if dp[i][j] >= INF: continue
        for l, k in [(1, 1), (2, 1), (3, 1), (4, 1), (1, 2), (1, 3)]:
            if i + l > n or j + k > m or len({p[0] for p in phr[i:i + l]}) > 1: continue
            d = segs[j + k - 1][1] - segs[j][0]; e = sum(p[1] for p in phr[i:i + l]) * rate
            c = dp[i][j] + ((d - e) / max(0.6, e)) ** 2 + 0.15 * (l - 1) + 0.6 * (k - 1)
            if c < dp[i + l][j + k]: dp[i + l][j + k] = c; bk[i + l][j + k] = (i, j, l, k)
groups, i, j = [], n, m
while i > 0 or j > 0:
    g = bk[i][j]; groups.append(g); i, j = g[0], g[1]
groups.reverse()
span = {}
for pi, pj, l, k in groups:
    s = span.setdefault(phr[pi][0], [segs[pj][0], 0]); s[1] = segs[pj + k - 1][1]
for bid, _ in blocks: print(f"{bid:6} take {span[bid][0]:7.2f} -> {span[bid][1]:7.2f}")

# Clips of the take placed in the film (a block may be cut into several clips, even reordered).
clips = json.load(open(PLACE, encoding="utf-8"))
def film(tk, bid):
    for c in clips:
        if c["id"] == bid and c["take"][0] - 0.05 <= tk <= c["take"][1] + 0.05:
            return c["from"] + (tk - c["take"][0])
    raise ValueError(f"{bid}: take time {tk:.2f} is in no clip")
items = []
for bid, b in blocks:
    wt = []
    for pi, pj, l, k in groups:
        if phr[pi][0] != bid: continue
        a, e, nw = segs[pj][0], segs[pj + k - 1][1], sum(p[2] for p in phr[pi:pi + l])
        wt += [(film(a + (e - a) * q / nw, bid), film(a + (e - a) * (q + 1) / nw, bid)) for q in range(nw)]
    # Acronyms lose their dots first so the sentence split doesn't break inside them (still one word each).
    text = re.sub(r"\s+", " ", re.sub(r"\[[^\]]*\]\s*", "", b)).replace("...", "…").replace("C.L.I.", "CLI").replace("A.I.", "AI").strip()
    clauses = []
    for snt in [x.strip() for x in re.findall(r"[^.?!…]+[.?!…]*", text) if x.strip()]:
        cur = ""
        for part in (re.split(r"(?<=,) ", snt) if len(snt) > 84 else [snt]):
            if cur and len(cur) + 1 + len(part) > 84: clauses.append(cur); cur = part
            else: cur = (cur + " " + part).strip()
        if cur: clauses.append(cur)
    w = 0
    for c in clauses:
        nw = len(re.findall(WORD, c))
        items.append([wt[w][0], wt[w + nw - 1][1], c.replace("BROKEN", "broken")])
        w += nw
    assert w == len(wt), (bid, w, len(wt))
items.sort(key=lambda it: it[0])
for k, it in enumerate(items):
    nxt = items[k + 1][0] if k + 1 < len(items) else it[1] + 2
    it[1] = min(max(it[1] + 0.15, it[0] + 1.0), nxt - 0.05)
def wrap(s):
    if len(s) <= 42: return s
    ws = s.split()
    return min(((" ".join(ws[:k]) + "\n" + " ".join(ws[k:])) for k in range(1, len(ws))), key=lambda x: max(map(len, x.split("\n"))))
ts = lambda t: "%02d:%02d:%06.3f" % (t // 3600, t % 3600 // 60, t % 60)
with open(OUT, "w", encoding="utf-8", newline="\n") as f:
    for k, (a, e, x) in enumerate(items, 1): f.write(f"{k}\n{ts(a).replace('.', ',')} --> {ts(e).replace('.', ',')}\n{wrap(x)}\n\n")
print(f"{OUT}: {len(items)} cues")
