r"""Makes the kit's cast of cut-out people as data (character.json and SVG drawings, the format Dex is
in), from short descriptions at the bottom of this file: build, skin, hair, face, headwear, clothes
and shoes. Each gets web/characters/<id>/ and a loader, web/characters/<id>.js. Everything is drawn on
Dex's frame (his heads and torsos, scaled), so they share his style, his rig and his clips.
    python tools/make_people.py            (all of them)
    python tools/make_people.py rosa kenji (some)
"""
import json, os, re, sys

KIT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
INK, LW = '#1D1A24', 3.4


# ---------- SVG writing ----------
def num(x):
    x = round(x, 3) if isinstance(x, float) else x
    if isinstance(x, float) and x.is_integer():
        return str(int(x))
    return repr(x) if isinstance(x, float) else str(x)


class SVG:
    def __init__(self, title, box):
        self.title, self.box, self.clips, self.body = title, box, [], []

    def clip(self, d):
        for i, c in enumerate(self.clips):
            if f'<path d="{d}"/>' in c:
                return f'c{i + 1}'
        self.clips.append(f'    <clipPath id="c{len(self.clips) + 1}"><path d="{d}"/></clipPath>')
        return f'c{len(self.clips)}'

    def write(self, folder, name):
        head = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{self.box}">', f'  <title>{self.title}</title>']
        if self.clips:
            head += ['  <defs>', *self.clips, '  </defs>']
        os.makedirs(os.path.join(folder, 'svg'), exist_ok=True)
        with open(os.path.join(folder, 'svg', name), 'w', encoding='utf-8', newline='\n') as f:
            f.write('\n'.join(head + [indent(e, 1) for e in self.body] + ['</svg>', '']))


def indent(el, n):
    return '\n'.join('  ' * n + line for line in el.split('\n'))


def attrs(**a):
    return ' '.join(f'{k.replace("_", "-")}="{num(v)}"' for k, v in a.items() if v is not None)


def ink(d, fill=None, lw=LW):
    return f'<path d="{d}" {attrs(fill=fill or "none", stroke=INK if lw else "none", stroke_width=lw if lw else None)}/>'


def stroke(d, lw=LW, col=INK):
    return f'<path d="{d}" {attrs(fill="none", stroke=col, stroke_width=lw)}/>'


def line(pts, lw=LW, col=INK):
    return f'<polyline points="{" ".join(f"{num(x)},{num(y)}" for x, y in pts)}" {attrs(fill="none", stroke=col, stroke_width=lw)}/>'


def rect(x, y, w, h, fill):
    return f'<rect {attrs(x=x, y=y, width=w, height=h, fill=fill)}/>'


def circle(cx, cy, r, fill, lw=LW):
    return f'<circle {attrs(cx=cx, cy=cy, r=r, fill=fill, stroke=INK if lw else "none", stroke_width=lw if lw else None)}/>'


def group(children, transform=None, clip=None, **data):
    a = attrs(transform=transform, clip_path=f'url(#{clip})' if clip else None)
    d = ' '.join(f'data-{k}="{num(v)}"' for k, v in data.items())
    opening = f'<g{" " + a if a else ""}{" " + d if d else ""}'
    if not children:
        return opening + '/>'
    return opening + '>\n' + '\n'.join(indent(c, 1) for c in children) + '\n</g>'


def put(x, y, sx, children, **data):
    return group(children, transform=f'translate({num(x)} {num(y)}) scale({num(sx)} 1)', **data)


def morph(d0, d1, fill, lw=LW):
    return f'<path d="{d0}" data-morph="jaw" data-morph-at="30" data-morph-d="{d1}" {attrs(fill=fill, stroke=INK if lw else "none", stroke_width=lw if lw else None)}/>'


# ---------- paths: scaling and moving them ----------
PAIRS = {'M': 2, 'L': 2, 'T': 2, 'C': 6, 'S': 4, 'Q': 4}


def tf(d, sx=1.0, sy=1.0, cx=0.0, cy=0.0, dx=0.0, dy=0.0):
    """A path scaled about (cx, cy) and moved by (dx, dy): absolute and relative commands both."""
    out, cmd, args = [], None, []
    toks = re.findall(r'[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?', d)

    def flush():
        if cmd is None:
            return
        up, rel = cmd.upper(), cmd.islower()
        vals = [float(a) for a in args]
        if up in PAIRS:
            for i in range(0, len(vals), 2):
                x, y = vals[i], vals[i + 1]
                vals[i], vals[i + 1] = (x * sx, y * sy) if rel else (cx + (x - cx) * sx + dx, cy + (y - cy) * sy + dy)
        elif up == 'H':
            vals = [v * sx if rel else cx + (v - cx) * sx + dx for v in vals]
        elif up == 'V':
            vals = [v * sy if rel else cy + (v - cy) * sy + dy for v in vals]
        elif up == 'A':
            for i in range(0, len(vals), 7):
                vals[i] *= abs(sx); vals[i + 1] *= abs(sy)
                x, y = vals[i + 5], vals[i + 6]
                vals[i + 5], vals[i + 6] = (x * sx, y * sy) if rel else (cx + (x - cx) * sx + dx, cy + (y - cy) * sy + dy)
        out.append(cmd + (' ' + ' '.join(num(v) for v in vals) if vals else ''))

    for t in toks:
        if re.match(r'[a-zA-Z]', t):
            flush(); cmd, args = t, []
        else:
            args.append(t)
    flush()
    return ' '.join(out)


# ---------- Dex's frame: his heads, ears and torsos ----------
EAR = 'M 0 -17 C 17 -21 25 -3 20 11 C 16 21 5 23 -2 17 Z'
NOSE_FRONT = 'M -5 -86 C -15 -70 -11 -62 -1 -62 C 7 -62 12 -66 12 -72'


def head_front(j):
    return f'M 0 {num(-4 + j)} C 48 {num(-4 + j)} 82 {num(-40 + j * 0.5)} 86 -104 C 90 -160 60 -196 0 -196 C -60 -196 -90 -160 -86 -104 C -82 {num(-40 + j * 0.5)} -48 {num(-4 + j)} 0 {num(-4 + j)} Z'
def head_34(j):
    return f'M 20 {num(-4 + j)} C 62 {num(-6 + j)} 86 {num(-44 + j * 0.5)} 88 -104 C 90 -162 56 -196 -4 -196 C -64 -196 -92 -160 -88 -104 C -84 {num(-46 + j * 0.5)} -34 {num(-4 + j)} 20 {num(-4 + j)} Z'
def head_side(j):
    return (f'M -34 {num(-2 + j * 0.6)} C 4 {num(-2 + j)} 34 {num(j)} 48 {num(-10 + j)} C 60 {num(-20 + j)} 62 {num(-32 + j * 0.8)} 64 {num(-40 + j * 0.5)} '
            f'C 68 -44 70 -48 70 -54 C 70 -58 71 -60 72 -62 C 96 -60 102 -86 80 -92 C 82 -112 84 -132 82 -150 C 78 -180 44 -196 -4 -196 '
            f'C -62 -196 -94 -156 -92 -104 C -90 -62 -68 {num(-28 + j * 0.5)} -34 {num(-2 + j * 0.6)} Z')
SKULL_BACK = 'M -30 0 C -36 -30 -82 -52 -86 -104 C -90 -160 -60 -196 0 -196 C 60 -196 90 -160 86 -104 C 82 -52 36 -30 30 0 Z'
SKULL_34BACK = 'M -30 0 C -40 -30 -84 -50 -88 -104 C -90 -162 -56 -196 4 -196 C 64 -196 92 -160 88 -104 C 86 -60 60 -30 34 -2 Z'
HEAD_OUTLINE = {'front': head_front(0), '34': head_34(0), 'side': head_side(0), 'back': SKULL_BACK, '34back': SKULL_34BACK}
HEAD_BOX = '-190 -300 380 400'

TORSO = {
    'front': 'M -62 4 C -66 -70 -76 -180 -80 -226 C -82 -248 -66 -258 -34 -260 Q 0 -244 34 -260 C 66 -258 82 -248 80 -226 C 76 -180 66 -70 62 4 Z',
    '34': 'M -52 4 C -58 -70 -66 -180 -70 -228 C -70 -250 -52 -260 -22 -260 Q 20 -246 44 -258 C 70 -256 80 -240 78 -222 C 76 -180 72 -70 60 4 Z',
    'side': 'M -40 4 C -46 -80 -50 -190 -46 -236 C -42 -256 -20 -262 4 -262 C 30 -262 46 -250 50 -224 C 56 -180 54 -90 46 4 Z',
    'back': 'M -62 4 C -66 -70 -76 -180 -80 -226 C -82 -248 -66 -258 -34 -260 Q 0 -254 34 -260 C 66 -258 82 -248 80 -226 C 76 -180 66 -70 62 4 Z',
}
# the open front of a jacket or vest, the left panel (mirrored for the right), from Dex's vest
PANEL = 'M -62 -6 L -20 -6 C -22 -100 -26 -190 -28 -258 L -50 -260 C -54 -236 -66 -222 -79 -214 C -74 -160 -66 -70 -62 -6 Z'
PANEL_34_NEAR = 'M -52 -6 L 14 -6 C 12 -100 8 -190 4 -258 L -20 -260 C -26 -236 -46 -222 -67 -214 C -62 -160 -56 -70 -52 -6 Z'
PANEL_34_FAR = 'M 38 -6 L 60 -6 C 70 -70 74 -170 76 -214 C 70 -222 62 -236 56 -256 L 44 -256 C 42 -190 40 -100 38 -6 Z'
VEST_SIDE = 'M -40 -6 L 40 -6 C 48 -90 50 -170 46 -222 C 40 -248 28 -258 8 -262 L -8 -262 C -30 -258 -44 -246 -46 -230 C -48 -180 -46 -80 -40 -6 Z'
VEST_BACK = 'M -62 -6 L 62 -6 C 66 -70 74 -170 79 -214 C 66 -222 54 -236 50 -258 Q 0 -250 -50 -258 C -54 -236 -66 -222 -79 -214 C -74 -170 -66 -70 -62 -6 Z'
TORSO_BOX = '-150 -300 300 340'


def darker(c, k=0.78):
    r, g, b = int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)
    return '#%02X%02X%02X' % (int(r * k), int(g * k), int(b * k))


# ---------- hair ----------
# Hair is the head's own outline, made bigger (volume), clipped to what's above a hairline, and inked
# along the hairline; some styles add hair behind the head (long hair, a bun, an afro), drawn by a
# piece of its own behind the body.
HAIRLINE = {   # the region hair can cover, per view: forehead height f, and how far down the sides go (s)
    'front': lambda f, s: f'M -300 -600 L 300 -600 L 300 {s} L 92 {s} C 88 -130 60 {f + 12} 0 {f} C -60 {f + 12} -88 -130 -92 {s} L -300 {s} Z',
    '34': lambda f, s: f'M -300 -600 L 300 -600 L 300 -120 L 96 -120 C 82 -150 60 {f + 10} 24 {f} C -8 {f + 4} -26 -150 -32 -126 C -40 -100 -50 {s + 14} -70 {s} L -300 {s} Z',
    'side': lambda f, s: f'M 300 -600 L 300 {f - 30} L 78 {f} C 54 {f + 6} 22 -160 6 -132 C -2 -114 -12 -104 -30 -98 C -46 -92 -58 {s + 30} -66 {s} L -300 {s} L -300 -600 Z',
    'back': lambda f, s: f'M -300 -600 L 300 -600 L 300 {s} C 60 {s + 8} 30 {s + 16} 0 {s + 16} C -30 {s + 16} -60 {s + 8} -300 {s} Z',
    '34back': lambda f, s: f'M -300 -600 L 300 -600 L 300 -150 L 84 -150 C 74 -110 52 {s + 20} 20 {s + 8} L -300 {s} Z',
}
STYLES = {        # volume (scale of the head outline), forehead y, sides down to y (front / back of the head)
    'short': dict(vol=1.06, f=-166, s=-112, sb=-66),
    'side': dict(vol=1.08, f=-160, s=-112, sb=-66, part=True),
    'buzz': dict(vol=1.025, f=-170, s=-110, sb=-70),
    'bob': dict(vol=1.15, f=-150, s=-30, sb=-30, fringe=True),
    'long': dict(vol=1.14, f=-158, s=-40, sb=0, back='long'),
    'bun': dict(vol=1.04, f=-170, s=-112, sb=-70, back='bun'),
    'afro': dict(vol=1.1, f=-162, s=-96, sb=-50, back='afro'),
    'bald': dict(vol=1.03, f=None, s=-82, sb=-60),
}


def hair_front(svg, view, style, col):
    st = STYLES[style]
    out = []
    if style == 'bald':      # a fringe round the back of the head, at ear level, behind the ears
        region = {
            'front': 'M -300 -136 L -82 -136 C -74 -120 -74 -94 -84 -80 L -300 -80 Z M 300 -136 L 82 -136 C 74 -120 74 -94 84 -80 L 300 -80 Z',
            '34': 'M -300 -136 L -76 -136 C -70 -120 -70 -94 -80 -80 L -300 -80 Z',
            'side': 'M -300 -136 L -40 -136 C -30 -120 -30 -92 -44 -78 L -300 -78 Z',
            'back': 'M -300 -132 L 300 -132 L 300 -80 C 100 -74 -100 -74 -300 -80 Z',
            '34back': 'M -300 -132 L 300 -132 L 300 -80 C 100 -74 -100 -74 -300 -80 Z',
        }[view]
        vol = tf(HEAD_OUTLINE[view], st['vol'], st['vol'], 0, -110)
        out.append(group([ink(vol, col, LW * 0.8)], clip=svg.clip(region)))
        return out
    f, s = st['f'], (st['sb'] if view in ('back', '34back') else st['s'])
    region = HAIRLINE[view](f, s)
    vol = tf(HEAD_OUTLINE[view], st['vol'], st['vol'], 0, -110)
    out.append(group([ink(vol, col)], clip=svg.clip(region)))
    if st.get('part') and view in ('front', '34'):
        x = -34 if view == 'front' else -10
        out.append(stroke(f'M {x} {-196 * st["vol"] + 12} C {x - 4} -186 {x - 6} -178 {x - 10} {f + 6}', LW * 0.7, darker(col, 0.6)))
    if st.get('fringe') and view in ('front', '34'):
        dx = 0 if view == 'front' else 22
        out.append(ink(f'M {dx - 70} {f - 4} C {dx - 40} {f + 22} {dx + 20} {f + 22} {dx + 72} {f - 6} L {dx + 60} {f - 30} L {dx - 60} {f - 30} Z', col, 0))
    if style == 'buzz':
        out.append(group([stroke(tf(HEAD_OUTLINE[view], 1.0, 1.0), LW * 0.4, darker(col, 0.8))], clip=svg.clip(region)))
    return out


def hair_back(view, style, col):
    """The hair behind the head and body, for the hairBack piece: long hair, a bun, an afro."""
    kind = STYLES[style].get('back')
    if kind == 'long':
        shapes = {
            'front': 'M -104 -170 C -122 -90 -120 10 -110 70 L 110 70 C 120 10 122 -90 104 -170 Z',
            '34': 'M -110 -170 C -126 -90 -122 10 -108 70 L 80 70 C 90 10 94 -90 80 -170 Z',
            'side': 'M -100 -170 C -120 -90 -118 10 -96 70 L 10 70 C 0 20 -10 -60 -4 -170 Z',
            'back': 'M -100 -132 C -124 -70 -120 20 -108 90 L 108 90 C 120 20 124 -70 100 -132 C 60 -124 -60 -124 -100 -132 Z',
            '34back': 'M -104 -132 C -126 -70 -122 20 -108 90 L 96 90 C 110 20 116 -70 94 -132 C 50 -124 -60 -124 -104 -132 Z',
        }
        return [ink(shapes[view], col)]
    if kind == 'bun':
        at = {'front': (0, -214), '34': (-20, -212), 'side': (-70, -196), 'back': (0, -200), '34back': (8, -204)}[view]
        return [circle(at[0], at[1], 38, col), stroke(f'M {at[0] - 22} {at[1] + 8} C {at[0] - 8} {at[1] + 20} {at[0] + 12} {at[1] + 20} {at[0] + 24} {at[1] + 6}', LW * 0.6, darker(col, 0.7))]
    if kind == 'afro':
        cx = {'front': 0, '34': -8, 'side': -20, 'back': 0, '34back': 4}[view]
        bumps = ' '.join(f'{num(cx + 150 * __import__("math").cos(a / 18 * 6.2832))} {num(-140 + 138 * __import__("math").sin(a / 18 * 6.2832))}' for a in range(18))
        pts = [(cx + 152 * __import__('math').cos(a / 24 * 6.2832), -140 + 140 * __import__('math').sin(a / 24 * 6.2832)) for a in range(24)]
        d = f'M {num(pts[0][0])} {num(pts[0][1])} ' + ' '.join(
            f'Q {num((pts[i][0] + pts[(i + 1) % 24][0]) / 2 * 1.09 - cx * 0.09)} {num((pts[i][1] + pts[(i + 1) % 24][1]) / 2 * 1.09 + 140 * 0.09)} {num(pts[(i + 1) % 24][0])} {num(pts[(i + 1) % 24][1])}' for i in range(24)) + ' Z'
        return [ink(d, col)]
    return []


# ---------- faces: extras ----------
def beard(view, col):
    if view == 'front':
        d0 = 'M -86 -100 C -86 -44 -52 -4 0 -4 C 52 -4 86 -44 86 -100 C 74 -80 54 -60 26 -56 C 10 -54 -10 -54 -26 -56 C -54 -60 -74 -80 -86 -100 Z'
    elif view == '34':
        d0 = 'M -86 -100 C -82 -44 -34 -4 20 -4 C 62 -6 86 -44 88 -100 C 80 -80 66 -62 44 -58 C 28 -56 12 -56 -2 -58 C -40 -62 -70 -80 -86 -100 Z'
    else:
        d0 = 'M -36 -100 C -40 -60 -38 -30 -34 -2 C 4 -2 34 0 48 -10 C 60 -22 64 -34 66 -44 C 50 -50 40 -56 30 -64 C 10 -70 -10 -84 -36 -100 Z'
    # the chin comes down with the jaw
    d1 = re.sub(r'(-?\d+\.?\d*) (-?\d+\.?\d*)', lambda m: f'{m.group(1)} {num(float(m.group(2)) + (30 if float(m.group(2)) > -40 else 15 if float(m.group(2)) > -70 else 0))}', d0)
    return morph(d0, d1, col, LW * 0.8)


def moustache(view, col):
    at = {'front': (0, -58, 1), '34': (42, -58, 0.84), 'side': (56, -58, 0.58)}[view]
    return put(at[0], at[1], at[2], [ink('M -28 0 C -16 -12 -4 -8 0 -4 C 4 -8 16 -12 28 0 C 20 10 6 6 0 3 C -6 6 -20 10 -28 0 Z', col, LW * 0.8)])


def glasses(view, kind, col='#2B2B35'):
    lens = lambda: ('M -30 -18 C -30 -34 30 -34 30 -18 L 30 14 C 30 30 -30 30 -30 14 Z' if kind == 'square'
                    else 'M -31 0 C -31 -42 31 -42 31 0 C 31 42 -31 42 -31 0 Z')
    if view == 'front':
        return [put(s * 30, -104, 1, [stroke(lens(), LW * 0.9, col)]) for s in (-1, 1)] + [stroke('M -1 -106 Q 0 -112 1 -106', LW * 0.9, col), stroke('M -12 -110 Q 0 -118 12 -110', LW * 0.8, col)]
    if view == '34':
        return [put(50, -104, 0.74, [stroke(lens(), LW * 0.9, col)]), put(-6, -104, 0.96, [stroke(lens(), LW * 0.9, col)]), stroke('M 24 -110 Q 30 -116 36 -110', LW * 0.8, col),
                stroke('M -36 -108 L -60 -104', LW * 0.8, col)]
    if view == 'side':
        return [put(48, -104, 0.5, [stroke(lens(), LW * 0.9, col)]), stroke('M 32 -108 L -16 -104', LW * 0.8, col)]
    return []          # from behind, the arms are hidden by the head


def earring(x, y):
    return circle(x, y + 16, 6, '#E9C24A', LW * 0.6)


# ---------- headwear ----------
def headwear(svg, view, kind, col):
    if kind == 'hardhat':
        k = {'front': (1, 0), '34': (1, 4), 'side': (1, -2), 'back': (1, 0), '34back': (1, -4)}[view]
        dome = tf('M -102 -150 C -106 -228 -58 -266 0 -266 C 58 -266 106 -228 102 -150 Z', 1, 1, 0, 0, k[1])
        brim = {'front': 'M -118 -152 L 118 -152 Q 124 -140 112 -136 L -112 -136 Q -124 -140 -118 -152 Z',
                '34': 'M -116 -154 L 124 -150 Q 132 -138 118 -134 L -110 -138 Q -122 -142 -116 -154 Z',
                'side': 'M -108 -152 L 136 -152 Q 146 -140 132 -136 L -104 -136 Q -116 -140 -108 -152 Z',
                'back': 'M -118 -152 L 118 -152 Q 124 -140 112 -136 L -112 -136 Q -124 -140 -118 -152 Z',
                '34back': 'M -122 -150 L 116 -154 Q 124 -142 110 -138 L -116 -134 Q -130 -138 -122 -150 Z'}[view]
        ridge = {'front': 'M 0 -266 L 0 -156', '34': 'M 24 -264 C 30 -230 32 -190 30 -156', 'side': 'M -10 -264 C 10 -230 16 -190 16 -156', 'back': 'M 0 -266 L 0 -156', '34back': 'M -20 -264 C -26 -230 -28 -190 -26 -156'}[view]
        return [ink(dome, col), group([stroke(ridge, 10, darker(col, 0.9)), stroke(ridge, LW * 0.6)], clip=svg.clip(dome)), ink(brim, darker(col, 0.92))]
    if kind == 'beanie':
        dome = tf('M -94 -160 C -98 -222 -54 -250 0 -250 C 54 -250 98 -222 94 -160 Z', 1, 1)
        cuff = 'M -97 -178 L 97 -178 Q 103 -162 97 -146 L -97 -146 Q -103 -162 -97 -178'
        ribs = [line([[x, -173], [x, -151]], 2, darker(col, 0.8)) for x in range(-88, 90, 13)]
        return [ink(dome, col), f'<path d="{cuff}" fill="{col}" stroke="none"/>', group(ribs, clip=svg.clip(cuff)), ink(cuff)]
    if kind == 'headset':
        band = {'front': 'M -100 -110 C -110 -220 110 -220 100 -110', '34': 'M -96 -108 C -104 -222 96 -226 64 -118', 'side': 'M -30 -104 C -40 -226 30 -236 -8 -110',
                'back': 'M -100 -110 C -110 -220 110 -220 100 -110', '34back': 'M -70 -114 C -100 -226 100 -222 96 -108'}[view]
        out = [stroke(band, 13), stroke(band, 7, col)]
        cups = {'front': [(-98, -104), (98, -104)], '34': [(-78, -104)], 'side': [(-22, -104)], 'back': [(-98, -104), (98, -104)], '34back': [(84, -104)]}[view]
        for x, y in cups:
            out.append(ink(f'M {x - 14} {y - 22} h 28 v 44 h -28 Z', '#2B2F38', LW * 0.8))
        mic = {'front': 'M -98 -84 C -80 -40 -40 -36 -16 -42', '34': 'M -76 -84 C -60 -40 -10 -34 20 -40', 'side': 'M -18 -84 C -4 -40 30 -34 48 -40'}.get(view)
        if mic:
            out += [stroke(mic, 5), circle(*[float(v) for v in mic.split()[-2:]], 5, '#2B2F38', LW * 0.6)]
        return out
    return []


# ---------- heads ----------
def head_svgs(p, folder):
    skin, hc, name = p['skin'], p['hairColor'], p['name']
    face = {'front': (0, 1), '34': (1, 1), 'side': (2, 1)}

    def ear_at(x, y, s, sx=1):
        return put(x, y, s * sx, [ink(EAR, skin), stroke('M 4 -7 C 12 -6 13 4 7 9', LW * 0.75)])

    def features(view):
        if view == 'front':
            out = []
            for side in (-1, 1):
                out += [put(side * 30, -104, 1, [], feature='eye', side=side), put(side * 30, -140, 1, [], feature='brow', side=side)]
            return out + [stroke(NOSE_FRONT, LW)], group([], feature='mouth', x=0, y=-44, sx=1, drop=0.35)
        if view == '34':
            return [put(50, -104, 0.74, [], feature='eye', side=1, look=0.35), put(-6, -104, 0.96, [], feature='eye', side=-1, look=0.35),
                    put(50, -140, 0.72, [], feature='brow', side=1), put(-6, -140, 0.95, [], feature='brow', side=-1),
                    ink('M 70 -90 C 92 -80 98 -66 82 -61 C 76 -60 71 -62 68 -65 L 66 -80 Z', skin, 0),
                    stroke('M 70 -90 C 92 -80 98 -66 82 -61 C 76 -60 71 -62 68 -65', LW)], group([], feature='mouth', x=42, y=-44, sx=0.84, drop=0.35)
        return [stroke('M 78 -68 C 82 -70 84 -74 82 -78', LW * 0.8), put(48, -104, 0.5, [], feature='eye', side=-1, look=0.8),
                put(46, -140, 0.6, [], feature='brow', side=-1)], group([], feature='mouth', x=53, y=-44, sx=0.58, drop=0.35)

    for view in ('front', '34', 'side', 'back', '34back'):
        s = SVG(f'{name}: head, {view}', HEAD_BOX)
        body = []
        if view == 'front':
            body += [ear_at(-84, -104, -1), ear_at(84, -104, 1), morph(head_front(0), head_front(30), skin)]
            if p.get('earrings'): body += [earring(-84, -104), earring(84, -104)]
        elif view == '34':
            body += [morph(head_34(0), head_34(30), skin), ear_at(-64, -104, -1)]
            if p.get('earrings'): body += [earring(-66, -104)]
        elif view == 'side':
            body += [morph(head_side(0), head_side(30), skin), ear_at(-22, -104, -1, 1.1)]
            if p.get('earrings'): body += [earring(-24, -104)]
        elif view == 'back':
            body += [ear_at(-84, -104, -1), ear_at(84, -104, 1), ink(SKULL_BACK, skin)]
        else:
            body += [ink(SKULL_34BACK, skin), ear_at(64, -104, 1)]
        if view in face:
            feats, mouth = features(view)
            if p.get('facial') == 'beard': body.append(beard(view, p.get('facialColor', hc)))
            body += feats
            if p.get('facial') == 'moustache': body.append(moustache(view, p.get('facialColor', hc)))
            body.append(mouth)
        body += hair_front(s, view, p['hair'], hc)
        if p.get('glasses'): body += glasses(view, p['glasses'])
        body += headwear(s, view, p.get('hat'), p.get('hatColor', '#F4F3EE'))
        s.body = body
        s.write(folder, f'head-{view}.svg')
        back = hair_back(view, p['hair'], hc)
        if back:
            s = SVG(f'{name}: hair behind, {view}', HEAD_BOX)
            s.body = back
            s.write(folder, f'hairback-{view}.svg')
    return bool(hair_back('front', p['hair'], hc))


# ---------- torsos: the clothes ----------
def torso_svgs(p, folder):
    b = p['build']
    T = {v: tf(d, b, 1) for v, d in TORSO.items()}
    top, c1, c2, name = p['top'], p.get('topColor', p.get('underColor', '#6E7682')), p.get('topColor2', '#F2EEE6'), p['name']
    views = ('front', '34', 'side', 'back', '34back')

    def neck(view):
        if view in ('back', '34back'):
            return []
        d = {'front': 'M -30 -258 Q 0 -238 30 -258', '34': 'M -6 -258 Q 20 -240 42 -256', 'side': 'M 0 -260 Q 20 -250 36 -254'}[view]
        return [stroke(tf(d, b, 1), LW * 0.8)]

    def panels(view, col, lapel=False):
        if view == 'front':
            out = []
            for sd in (-1, 1):
                pn = tf(PANEL, b * sd, 1)
                kids = [ink(pn, col)]
                if lapel:
                    kids.append(ink(tf('M -28 -258 L -50 -260 L -40 -206 L -24 -196 Z', b * sd, 1), darker(col, 0.85), LW * 0.8))
                out += kids
            return out
        if view == '34':
            return [ink(tf(PANEL_34_NEAR, b, 1), col), ink(tf(PANEL_34_FAR, b, 1), col)] + ([ink(tf('M 4 -258 L -20 -260 L -10 -206 L 6 -196 Z', b, 1), darker(col, 0.85), LW * 0.8)] if lapel else [])
        if view == 'side':
            return [ink(tf(VEST_SIDE, b, 1), col)]
        return [ink(tf(VEST_BACK, b, 1) if view == 'back' else tf(VEST_BACK, b * 0.9, 1), col)]

    def base(view, col):
        d = T['back'] if view == 'back' else tf(TORSO['back'], b * 0.9, 1) if view == '34back' else T[view]
        return [ink(d, col)]

    def belt(view, col='#2A2A30'):
        x0, x1 = {'front': (-62, 62), '34': (-52, 60), 'side': (-40, 48), 'back': (-62, 62), '34back': (-56, 56)}[view]
        return [ink(f'M {num(x0 * b)} -12 L {num(x1 * b)} -12 L {num(x1 * b)} 6 L {num(x0 * b)} 6 Z', col, LW * 0.8)]

    for view in views:
        s = SVG(f'{name}: torso, {view}', TORSO_BOX)
        under = c2 if top in ('blazer', 'cardigan', 'hivis', 'overalls') else c1
        body = base(view, under if top != 'hivis' else p.get('underColor', '#6E7682'))
        if p['bottom'] != 'skirt' and top not in ('hoodie', 'overalls'):
            body += belt(view)
        if top == 'tee':
            body += neck(view)
        elif top == 'polo':
            body += neck(view)
            if view == 'front': body += [ink(tf('M -32 -258 L -4 -244 L -18 -230 Z', b, 1), darker(c1, 0.85), LW * 0.7), ink(tf('M 32 -258 L 4 -244 L 18 -230 Z', b, 1), darker(c1, 0.85), LW * 0.7), stroke('M 0 -244 L 0 -206', LW * 0.6)]
            if view == '34': body += [ink(tf('M -6 -258 L 14 -244 L 4 -230 Z', b, 1), darker(c1, 0.85), LW * 0.7), stroke(tf('M 16 -244 L 16 -206', b, 1), LW * 0.6)]
        elif top in ('shirt', 'tie'):
            if view == 'front':
                body += [ink(tf('M -34 -258 L 0 -242 L -14 -228 Z', b, 1), '#FFFFFF', LW * 0.7), ink(tf('M 34 -258 L 0 -242 L 14 -228 Z', b, 1), '#FFFFFF', LW * 0.7)]
                if top == 'tie': body += [ink('M -8 -242 L 8 -242 L 10 -226 L 14 -110 L 0 -92 L -14 -110 L -10 -226 Z', p.get('tieColor', '#B3262E'), LW * 0.8)]
                else: body += [stroke('M 0 -242 L 0 -14', LW * 0.6)]
            if view == '34':
                body += [ink(tf('M -8 -258 L 16 -242 L 2 -228 Z', b, 1), '#FFFFFF', LW * 0.7)]
                if top == 'tie': body += [ink(tf('M 10 -242 L 24 -242 L 26 -226 L 28 -110 L 16 -94 L 6 -110 L 8 -226 Z', b, 1), p.get('tieColor', '#B3262E'), LW * 0.8)]
            if view == 'side' and top == 'tie':
                body += [ink('M 40 -238 L 50 -236 L 52 -130 L 44 -116 Z', p.get('tieColor', '#B3262E'), LW * 0.8)]
        elif top == 'blouse':
            if view == 'front': body += [stroke(tf('M -30 -258 L 0 -214 L 30 -258', b, 1), LW * 0.8)]
            if view == '34': body += [stroke(tf('M -6 -258 L 18 -218 L 42 -256', b, 1), LW * 0.8)]
        elif top in ('blazer', 'cardigan'):
            if view in ('front', '34'):
                body += [stroke(tf('M -30 -258 L 0 -214 L 30 -258', b, 1) if view == 'front' else tf('M -6 -258 L 18 -218 L 42 -256', b, 1), LW * 0.8)]
            body += panels(view, c1, lapel=(top == 'blazer'))
            if top == 'cardigan' and view == 'front':
                body += [circle(num(-24 * b), y, 4, darker(c1, 0.7), LW * 0.5) for y in (-180, -140, -100, -60)]
        elif top == 'hoodie':
            if view in ('front', '34'):
                dx = 0 if view == 'front' else 14
                body += [ink(tf(f'M {dx - 40} -110 L {dx + 40} -110 L {dx + 52} -40 L {dx - 52} -40 Z', b, 1), darker(c1, 0.9), LW * 0.8),
                         stroke(f'M {dx - 16} -250 L {dx - 18} -196', LW * 0.6), stroke(f'M {dx + 16} -250 L {dx + 18} -196', LW * 0.6),
                         ink(tf(f'M {dx - 46} -262 C {dx - 30} -238 {dx + 30} -238 {dx + 46} -262 C {dx + 30} -250 {dx - 30} -250 {dx - 46} -262 Z', b, 1), darker(c1, 0.8), LW * 0.8)]
            if view in ('back', '34back'):
                body += [ink(tf('M -54 -262 C -60 -220 -30 -196 0 -196 C 30 -196 60 -220 54 -262 Z', b, 1), darker(c1, 0.85))]
        elif top == 'flannel':
            d = base(view, c1)[0]
            cl = s.clip(re.search(r'd="([^"]+)"', d).group(1))
            stripes = [line([[x, -300], [x, 20]], 7, darker(c1, 0.72)) for x in range(-120, 130, 34)] + [line([[-150, y], [150, y]], 6, darker(c1, 0.72)) for y in range(-250, 10, 40)]
            body += [group(stripes, clip=cl), ink(re.search(r'd="([^"]+)"', d).group(1))] + neck(view)
        elif top == 'hivis':
            vest = p.get('vestColor', '#D3E64B')
            body += neck(view)
            vparts = panels(view, vest)
            body += vparts
            for vp in vparts:          # the reflective bands
                dd = re.search(r'd="([^"]+)"', vp).group(1)
                cl = s.clip(dd)
                body += [group([rect(-150, -66, 300, 14, '#D8DCE0'), line([[-150, -66], [150, -66]], 1.8), line([[-150, -52], [150, -52]], 1.8),
                                rect(-150, -108, 300, 14, '#D8DCE0'), line([[-150, -108], [150, -108]], 1.8), line([[-150, -94], [150, -94]], 1.8)], clip=cl), ink(dd)]
        elif top == 'overalls':
            bib = {'front': 'M -44 -200 L 44 -200 L 50 4 L -50 4 Z', '34': 'M -30 -200 L 50 -200 L 54 4 L -36 4 Z', 'side': 'M 10 -200 L 44 -200 L 46 4 L 6 4 Z'}.get(view)
            if bib: body += neck(view) + [ink(tf(bib, b, 1), c1)]
            straps = {'front': [(-40, -200, -46, -262), (40, -200, 46, -262)], '34': [(-26, -200, -24, -262), (44, -200, 50, -258)], 'back': [(-40, 4, 30, -262), (40, 4, -30, -262)]}.get(view, [])
            body += [stroke(tf(f'M {a} {bb} L {cc} {d2}', b, 1), 12) for a, bb, cc, d2 in straps] + [stroke(tf(f'M {a} {bb} L {cc} {d2}', b, 1), 8, c1) for a, bb, cc, d2 in straps]
        if p.get('lanyard') and view in ('front', '34'):
            dx = 0 if view == 'front' else 16
            body += [stroke(f'M {dx - 24} -250 L {dx - 4} -170 L {dx + 20} -250', LW * 0.8, '#3A6FD8'), put(dx - 4, -150, 1, [ink('M -12 -20 h 24 v 32 h -24 Z', '#F4F3EE', 2.4), rect(-10.8, -18.8, 21.6, 8, '#3A6FD8')])]
        s.body = body
        s.write(folder, f'torso-{view}.svg')

    # the seat: trousers or a skirt
    for view, d in [('front', 'M -64 -12 L 64 -12 L 62 34 Q 0 46 -62 34 Z'), ('34', 'M -54 -12 L 62 -12 L 60 34 Q 6 44 -52 34 Z'), ('side', 'M -42 -12 L 48 -12 L 46 32 Q 2 40 -40 32 Z')]:
        s = SVG(f'{name}: seat, {view}', '-110 -30 220 260')
        if p['bottom'] == 'skirt':
            sk = {'front': 'M -66 -12 L 66 -12 L 90 190 Q 0 206 -90 190 Z', '34': 'M -56 -12 L 64 -12 L 88 190 Q 10 204 -80 190 Z', 'side': 'M -44 -12 L 50 -12 L 76 190 Q 10 200 -60 190 Z'}[view]
            s.body = [ink(tf(sk, b, 1), p['bottomColor'])]
        else:
            s.body = [ink(tf(d, b, 1), p['bottomColor'])]
        s.write(folder, f'seat-{view}.svg')
    s = SVG(f'{name}: neck', '-40 -50 80 80')
    s.body = [ink('M -22 20 L -22 -34 L 22 -34 L 22 20 Z', p['skin'])]
    s.write(folder, 'neck.svg')


# ---------- shoes ----------
SHOES = {
    'boots': {'front': ['M -24 -8 L 24 -8 L 25 14 C 34 18 36 38 22 38 L -22 38 C -36 38 -34 18 -25 14 Z', 'M -32 30 L 32 30 L 30 40 L -30 40 Z'],
              '34': ['M -24 -8 L 22 -8 L 24 12 C 40 14 50 24 48 32 L 48 38 L -26 38 L -27 16 Z', 'M -28 30 L 50 30 L 50 40 L -28 40 Z'],
              'side': ['M -22 -8 L 18 -8 L 20 10 C 42 12 58 20 58 30 L 58 38 L -24 38 L -24 18 Z', 'M -26 30 L 60 30 L 60 40 L -26 40 Z'],
              'back': ['M -24 -8 L 24 -8 L 26 30 L -26 30 Z', 'M -28 28 L 28 28 L 28 40 L -28 40 Z']},
    'sneakers': {'front': ['M -22 8 L 22 8 C 34 16 36 34 22 34 L -22 34 C -36 34 -34 16 -22 8 Z', 'M -30 30 L 30 30 L 28 40 L -28 40 Z'],
                 '34': ['M -22 8 L 20 8 C 40 12 50 24 48 34 L -24 34 Z', 'M -26 30 L 50 30 L 50 40 L -26 40 Z'],
                 'side': ['M -22 8 L 16 8 C 40 12 58 22 58 34 L -24 34 Z', 'M -26 30 L 60 30 L 60 40 L -26 40 Z'],
                 'back': ['M -22 8 L 22 8 L 26 32 L -26 32 Z', 'M -28 30 L 28 30 L 28 40 L -28 40 Z']},
    'dress': {'front': ['M -20 14 L 20 14 C 30 20 32 36 20 36 L -20 36 C -32 36 -30 20 -20 14 Z', 'M -26 34 L 26 34 L 24 40 L -24 40 Z'],
              '34': ['M -20 14 L 18 14 C 40 18 54 28 52 36 L -22 36 Z', 'M -24 34 L 54 34 L 54 40 L -24 40 Z'],
              'side': ['M -20 14 L 14 14 C 40 18 64 26 64 36 L -22 36 Z', 'M -24 34 L 66 34 L 66 40 L -24 40 Z'],
              'back': ['M -20 14 L 20 14 L 24 36 L -24 36 Z', 'M -26 34 L 26 34 L 26 40 L -26 40 Z']},
    'flats': {'front': ['M -18 18 L 18 18 C 28 24 28 38 18 38 L -18 38 C -28 38 -28 24 -18 18 Z', 'M -22 36 L 22 36 L 20 40 L -20 40 Z'],
              '34': ['M -18 18 L 16 18 C 36 22 48 30 46 38 L -20 38 Z', 'M -22 36 L 48 36 L 48 40 L -22 40 Z'],
              'side': ['M -18 18 L 12 18 C 36 22 56 30 56 38 L -20 38 Z', 'M -22 36 L 58 36 L 58 40 L -22 40 Z'],
              'back': ['M -18 18 L 18 18 L 22 38 L -22 38 Z', 'M -22 36 L 22 36 L 22 40 L -22 40 Z']},
}
SHOE_COLORS = {'boots': ('#83532F', '#2B2320'), 'sneakers': ('#E8E8EC', '#FFFFFF'), 'dress': ('#2A2224', '#141012'), 'flats': ('#5A3A44', '#2B1E22')}


def shoe_svgs(p, folder):
    kind = p['shoes']
    up, sole = p.get('shoeColors', SHOE_COLORS[kind])
    for view, (d_up, d_sole) in SHOES[kind].items():
        s = SVG(f'{p["name"]}: shoe, {view}', '-40 -20 110 70')
        s.body = [ink(d_up, up), ink(d_sole, sole, LW * 0.8)]
        if kind == 'sneakers': s.body.append(stroke({'front': 'M -10 14 L 10 20', '34': 'M 4 14 L 18 20', 'side': 'M 10 14 L 26 18', 'back': 'M -10 14 L 10 14'}[view], 2, '#9AA3B0'))
        s.write(folder, f'shoe-{view}.svg')


# ---------- the character ----------
def neutral_face():
    return {'eyes.open': 1, 'eyes.squint': 0, 'eyes.pupil': 1, 'lids.drop': 0, 'lids.slant': 0, 'lidL.drop': 0, 'lidR.drop': 0,
            'lidL.slant': 0, 'lidR.slant': 0, 'brows.up': 0, 'brows.in': 0, 'browL.up': 0, 'browR.up': 0, 'browL.slant': 0, 'browR.slant': 0,
            'mood.smile': 0, 'mouth.cornerL': 0, 'mouth.cornerR': 0, 'mouth.shape': 'rest'}


def make(p):
    folder = os.path.join(KIT, 'web', 'characters', p['id'])
    if os.path.exists(os.path.join(folder, 'svg')):
        for f in os.listdir(os.path.join(folder, 'svg')): os.remove(os.path.join(folder, 'svg', f))
    has_back = head_svgs(p, folder)
    torso_svgs(p, folder)
    shoe_svgs(p, folder)
    h, b = p['height'], p['build']
    A, F, T, S = 150 * h, 138 * h, 196 * h, 190 * h
    long_sleeves = p['top'] in ('shirt', 'tie', 'blazer', 'cardigan', 'hoodie', 'flannel') or p.get('longSleeves')
    sleeve_col = p.get('topColor', '#6E7682') if p['top'] != 'hivis' else p.get('underColor', '#6E7682')
    leg_col = p['bottomColor'] if p['bottom'] != 'skirt' else p.get('tights', p['skin'])
    arm = lambda bend: ({'kit': 'noodle', 'a': A, 'b': F, 'bend': bend, 'w': 27 * b, 'w2': 25 * b, 'color': 'sleeve'} if long_sleeves else
                        {'kit': 'noodle', 'a': A, 'b': F, 'bend': bend, 'w': 25 * b, 'w2': 23 * b, 'color': 'skin', 'sleeve': {'len': 60, 'w': 40 * b, 'color': 'sleeve'}})
    leg = lambda bend: {'kit': 'noodle', 'a': T, 'b': S, 'bend': bend, 'w': 44 * b, 'w2': 40 * b, 'round': 0.3, 'color': 'legs'}
    shoes = {str(a): f'svg/shoe-{n}.svg' for a, n in [(0, 'front'), (1, '34'), (2, 'side'), (4, 'back')]}
    all5 = {str(a): f'svg/{{}}-{n}.svg' for a, n in [(0, 'front'), (1, '34'), (2, 'side'), (3, '34back'), (4, 'back')]}
    ang = lambda prefix: {k: v.format(prefix) for k, v in all5.items()}
    bones = [
        {'name': 'hips', 'at': [0, round(-(T + S + 38), 1)]},
        {'name': 'legL', 'parent': 'hips', 'at': [round(-34 * b, 1), -4], 'len': T, 'z': 0, 'piece': 'legL'},
        {'name': 'shinL', 'parent': 'legL', 'at': [0, T], 'len': S, 'z': 0},
        {'name': 'footL', 'parent': 'shinL', 'at': [0, S], 'z': 0.1, 'piece': 'footL'},
        {'name': 'legR', 'parent': 'hips', 'at': [round(34 * b, 1), -4], 'len': T, 'z': 0, 'piece': 'legR'},
        {'name': 'shinR', 'parent': 'legR', 'at': [0, T], 'len': S, 'z': 0},
        {'name': 'footR', 'parent': 'shinR', 'at': [0, S], 'z': 0.1, 'piece': 'footR'},
        {'name': 'pelvis', 'parent': 'hips', 'at': [0, 0], 'z': 1, 'piece': 'pelvis'},
        {'name': 'torso', 'parent': 'hips', 'at': [0, 0], 'z': 2, 'piece': 'torso'},
        {'name': 'neck', 'parent': 'torso', 'at': [0, -250], 'z': 1.5, 'piece': 'neck'},
        {'name': 'head', 'parent': 'neck', 'at': [0, -22], 'z': 4, 'piece': 'head'},
        {'name': 'armL', 'parent': 'torso', 'at': [round(-72 * b, 1), -236], 'len': A, 'z': 5.5, 'piece': 'armL'},
        {'name': 'foreL', 'parent': 'armL', 'at': [0, A], 'len': F, 'z': 5.5},
        {'name': 'handL', 'parent': 'foreL', 'at': [0, F - 2], 'z': 6, 'piece': 'handL'},
        {'name': 'armR', 'parent': 'torso', 'at': [round(72 * b, 1), -236], 'len': A, 'z': 5.5, 'piece': 'armR'},
        {'name': 'foreR', 'parent': 'armR', 'at': [0, A], 'len': F, 'z': 5.5},
        {'name': 'handR', 'parent': 'foreR', 'at': [0, F - 2], 'z': 6, 'piece': 'handR'},
    ]
    pieces = {
        'head': {'angles': ang('head'), 'of': 'head'},
        'mouth': {'kit': 'mouthChart'},
        'neck': {'svg': 'svg/neck.svg'},
        'torso': {'angles': ang('torso'), 'of': 'body'},
        'pelvis': {'angles': {'0': 'svg/seat-front.svg', '1': 'svg/seat-34.svg', '2': 'svg/seat-side.svg'}, 'of': 'body', 'fallback': {'3': 1, '4': 0}},
        'armL': arm('foreL'), 'armR': arm('foreR'),
        'handL': {'kit': 'hand', 'side': -1, 'skin': 'skin', 'size': 1.02}, 'handR': {'kit': 'hand', 'side': 1, 'skin': 'skin', 'size': 1.02},
        'legL': leg('shinL'), 'legR': leg('shinR'),
        'footL': {'angles': shoes, 'of': 'body', 'fallback': {'3': 2}, 'scale': 1.2, 'front': {'flip': -1, 'rotate': 0.06}},
        'footR': {'angles': shoes, 'of': 'body', 'fallback': {'3': 2}, 'scale': 1.2, 'front': {'flip': 1, 'rotate': 0.06}},
    }
    chains = {
        'armL': {'bones': ['armL', 'foreL', 'handL'], 'side': 'L', 'kind': 'arm', 'bend': 'back'},
        'armR': {'bones': ['armR', 'foreR', 'handR'], 'side': 'R', 'kind': 'arm', 'bend': 'back'},
        'legL': {'bones': ['legL', 'shinL', 'footL'], 'side': 'L', 'kind': 'leg', 'bend': 'forward'},
        'legR': {'bones': ['legR', 'shinR', 'footR'], 'side': 'R', 'kind': 'leg', 'bend': 'forward'},
    }
    if has_back:           # hair behind the head: behind the body from the front, over it from behind
        bones.insert(10, {'name': 'hairBack', 'parent': 'neck', 'at': [0, -22], 'z': 0.5, 'piece': 'hairBack'})
        pieces['hairBack'] = {'angles': ang('hairback'), 'of': 'head'}
        chains['hair'] = {'bones': ['hairBack'], 'kind': 'hair'}
    j = {
        'id': p['id'], 'version': 1, 'name': p['name'], 'height': round(T + S + 38 + 250 + 22 + 250),
        'about': p['about'],
        'palette': {'skin': p['skin'], 'hair': p['hairColor'], 'sleeve': sleeve_col, 'legs': leg_col, 'mouth': '#3B1521', 'tongue': '#DE6878'},
        'ink': INK, 'line': LW,
        'face': {'eye': {'rx': 27, 'ry': 30, 'pupil': 5.4, 'lid': 'skin'}, 'brow': {'color': p.get('browColor', darker(p['hairColor'], 0.8 if p['hair'] != 'bald' else 0.62))}, 'mouth': {'w': 31, 'pal': {'mouth': 'mouth', 'tongue': 'tongue'}}},
        'bones': bones,
        'tags': {'root': 'hips', 'chest': 'torso', 'look': 'head', 'chains': chains,
                 'turn': {'offsets': {'1': {'neck.x': 8}, '2': {'neck.x': 12}, '3': {'neck.x': -4}}}},
        'pieces': pieces,
        'limits': {'shinL': [-0.15, 2.9], 'shinR': [-0.15, 2.9]},
        'rest': {'armL.r': 0.1, 'foreL.r': -0.1, 'armR.r': -0.1, 'foreR.r': 0.1, 'handL.shape': 'relaxed', 'handR.shape': 'relaxed',
                 'legL.r': 0.02, 'legR.r': -0.02, 'shinL.r': 0, 'shinR.r': 0, **neutral_face()},
        'poses': {
            'wave': {'armR.r': -2.5, 'foreR.r': -0.45, 'handR.shape': 'palm', 'handR.r': 0},
            'point': {'armR.r': -1.5, 'foreR.r': -0.05, 'handR.shape': 'point', 'handR.r': 0.1},
            'shrug': {'armL.r': 0.55, 'foreL.r': 1.3, 'armR.r': -0.55, 'foreR.r': -1.3, 'handL.shape': 'open', 'handR.shape': 'open', 'handL.r': 0.9, 'handR.r': -0.9},
            'thumbsUp': {'armR.r': -0.25, 'foreR.r': -1.35, 'handR.shape': 'thumb', 'handR.flip': 1, 'handR.r': 0.1},
            'hips': {'armL.r': 0.75, 'foreL.r': -1.6, 'armR.r': -0.75, 'foreR.r': 1.6, 'handL.shape': 'fist', 'handR.shape': 'fist', 'handL.r': 0.5, 'handR.r': -0.5},
            'cheer': {'armL.r': 2.7, 'foreL.r': 0.25, 'armR.r': -2.7, 'foreR.r': -0.25, 'handL.shape': 'fist', 'handR.shape': 'fist'},
        },
        'expressions': 'kit', 'clips': 'kit', 'life': {'seed': p.get('seed', 7)},
    }
    with open(os.path.join(folder, 'character.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(j, f, indent=2); f.write('\n')
    loader = (f"// {p['name']}, a cut-out stock character ({p['about']}):\n"
              f"// import {{ {p['id']}, pose, EXPR, POSES, REST }} from '/@kit/characters/{p['id']}.js'.\n"
              f"// Data, in characters/{p['id']}/, made by tools/make_people.py on Dex's frame (his rig, clips and style).\n"
              "import { loadCutout } from '../cutout.js';\n\n"
              f"export const {p['id']} = await loadCutout(new URL('./{p['id']}/', import.meta.url).href);\n"
              f"export const {{ rest: REST, poses: POSES, expressions: EXPR, palette: PAL }} = {p['id']};\n"
              f"export const pose = {p['id']}.pose;\n")
    with open(os.path.join(KIT, 'web', 'characters', f"{p['id']}.js"), 'w', encoding='utf-8', newline='\n') as f:
        f.write(loader)
    print('made', p['id'])


# ---------- the cast (all made up) ----------
PEOPLE = [
    dict(id='rosa', name='Rosa', about='a warehouse team lead who drives the forklifts', skin='#B77A55', height=1.0, build=1.0, hair='long', hairColor='#3A2418',
         hat='hardhat', hatColor='#F4F3EE', earrings=True, top='hivis', underColor='#6E7682', vestColor='#F28A2E', bottom='trousers', bottomColor='#5E6448', shoes='boots', seed=3),
    dict(id='marcus', name='Marcus', about='a picker on the day shift', skin='#6B4630', height=1.06, build=1.12, hair='buzz', hairColor='#1B1512', facial='beard',
         top='hivis', underColor='#2E3A5C', vestColor='#D3E64B', bottom='trousers', bottomColor='#3B4A6B', shoes='boots', seed=5),
    dict(id='priya', name='Priya', about='an inventory clerk with a headset', skin='#A86F4C', height=0.94, build=0.92, hair='bun', hairColor='#1E1614',
         hat='headset', hatColor='#3A3F48', top='polo', topColor='#1F8A8A', bottom='trousers', bottomColor='#3B4A6B', shoes='sneakers', lanyard=True, seed=9),
    dict(id='walt', name='Walt', about='a receiver with forty years on the dock', skin='#E0AC8A', height=1.0, build=1.14, hair='bald', hairColor='#C9C4BC', facial='moustache',
         facialColor='#B8B4AC', glasses='square', top='hivis', underColor='#A8352F', vestColor='#D3E64B', bottom='trousers', bottomColor='#8A7A58', shoes='boots', longSleeves=True, seed=11),
    dict(id='jess', name='Jess', about='a shipping clerk in a hoodie', skin='#F1C8A8', height=0.94, build=0.92, hair='bob', hairColor='#B8452A',
         top='hoodie', topColor='#6A4C93', bottom='trousers', bottomColor='#3B4A6B', shoes='sneakers', seed=13),
    dict(id='dana', name='Dana', about='an office manager', skin='#D9A077', height=1.0, build=0.95, hair='bob', hairColor='#2B1D16', glasses='round',
         top='blazer', topColor='#2B3A5C', topColor2='#F2EAD8', bottom='skirt', bottomColor='#3A3A44', tights='#4A4A55', shoes='flats', seed=15),
    dict(id='kenji', name='Kenji', about='the IT support tech', skin='#E8B98E', height=1.06, build=0.92, hair='side', hairColor='#16161C', glasses='square',
         top='hoodie', topColor='#6D7480', bottom='trousers', bottomColor='#2F3B55', shoes='sneakers', lanyard=True, seed=17),
    dict(id='amara', name='Amara', about='an accountant', skin='#5A3A28', height=1.0, build=1.0, hair='afro', hairColor='#17120F', earrings=True,
         top='cardigan', topColor='#D9A43A', topColor2='#F4F1EA', bottom='trousers', bottomColor='#2B3A5C', shoes='flats', seed=19),
    dict(id='greg', name='Greg', about='a salesman in a tie', skin='#D59A73', height=1.0, build=1.1, hair='side', hairColor='#5A3A22',
         top='tie', topColor='#BFD6EE', tieColor='#B3262E', bottom='trousers', bottomColor='#50535C', shoes='dress', seed=21),
    dict(id='linda', name='Linda', about='the receptionist', skin='#F0C7A4', height=0.94, build=0.98, hair='bun', hairColor='#C9C4BC', glasses='round',
         top='cardigan', topColor='#C46F82', topColor2='#F4F1EA', bottom='skirt', bottomColor='#2B3A5C', tights='#E8C4A8', shoes='flats', seed=23),
]

if __name__ == '__main__':
    want = set(sys.argv[1:])
    for p in PEOPLE:
        if not want or p['id'] in want:
            make(p)
