r"""Draws cut-out Pip as data: web/characters/pip-cutout/ (character.json and SVG drawings) and her
loader, web/characters/pip-cutout.js. She's the kit's toon Pip (characters/pip.js) redrawn in the
cut-out style, on the cast's frame (tools/make_people.py): Dex's heads, torsos, rig and clips. Her own
are a side-swept fringe and locks framing her face, a ponytail that swings on its own (a chain that
trails, placed by the head's angle), blue eyes, rosy cheeks, a teal sweater with ribbed cuffs, hem
and neckline and a Clapper pin, and white sneakers with orange soles.
    python tools/make_pip.py
"""
import json, os, sys
sys.dont_write_bytecode = True           # no __pycache__ in tools/ from importing make_people
from make_people import (KIT, INK, LW, SVG, tf, ink, stroke, line, rect, group, put, morph, num, EAR, NOSE_FRONT,
                         head_front, head_34, head_side, SKULL_BACK, SKULL_34BACK, HEAD_BOX, TORSO, TORSO_BOX,
                         SHOES, neutral_face)

ID, NAME = 'pip-cutout', 'Pip'
FOLDER = os.path.join(KIT, 'web', 'characters', ID)
PAL = {    # the toon Pip's colours
    'skin': '#F8CBA6', 'blush': '#F4A08F', 'hair': '#3B2B57', 'hairShade': '#291D40', 'hairLight': '#5B4A84',
    'top': '#2CB4A4', 'cuff': '#1A7469', 'rib': '#135A51', 'pants': '#35405F', 'shoe': '#FFFFFF', 'sole': '#FF8A1F',
    'tie': '#FF8A1F', 'pin': '#1B2330', 'iris': '#3F70B8', 'brow': '#2A1E40', 'mouth': '#4A1427', 'tongue': '#EE7082',
}
H, B = 0.94, 0.92          # her height and build, as the cast's (Jess's)


def ellipse(cx, cy, rx, ry, fill):
    return f'<ellipse cx="{num(cx)}" cy="{num(cy)}" rx="{num(rx)}" ry="{num(ry)}" fill="{fill}"/>'


def ear(x, y, s):
    return put(x, y, s, [ink(EAR, PAL['skin']), stroke('M 4 -7 C 12 -6 13 4 7 9', LW * 0.75)])


def eye(x, sx, side, look=None):
    return put(x, -104, sx, [], feature='eye', side=side, **({'look': look} if look is not None else {}))


def brow(x, sx, side):
    return put(x, -140, sx, [], feature='brow', side=side)


def mouth(x, sx):
    return group([], feature='mouth', x=x, y=-44, sx=sx, drop=0.35)


def hair(d):
    return ink(d, PAL['hair'])


def shine(d):
    return f'<path d="{d}" fill="{PAL["hairLight"]}" stroke="none"/>'


def strand(d):
    return stroke(d, 2.2, PAL['hairShade'])


# ---------- the head, from each angle ----------
# Hair: the locks behind the face first (and the back of the hair), the face over them, then the
# fringe over the face, and the brows last, over the fringe when they're raised. Heads are Dex's.
TOP = 'C 72 -214 114 -174 112 -118'          # the outline of her hair over the top, from the front
FRONT_BACK = ('M 0 -214 ' + TOP + ' C 111 -90 108 -66 99 -51 C 93 -41 82 -40 74 -50 C 70 -64 66 -84 64 -100 '
              'L -64 -100 C -66 -84 -70 -64 -74 -50 C -82 -40 -93 -41 -99 -51 C -108 -66 -111 -90 -112 -118 '
              'C -114 -174 -72 -214 0 -214 Z')
FRONT_FRINGE = ('M -112 -118 C -114 -174 -72 -214 0 -214 ' + TOP + ' C 108 -130 100 -144 90 -154 C 78 -166 62 -176 46 -182 '
                'C 34 -168 8 -160 -22 -159 C -54 -158 -82 -146 -100 -128 C -105 -123 -109 -120 -112 -118 Z')


def head_front_svg():
    return [
        hair(FRONT_BACK),
        ear(-84, -104, -1), ear(84, -104, 1),
        morph(head_front(0), head_front(30), PAL['skin']),
        ellipse(-55, -67, 16, 9, PAL['blush']), ellipse(55, -67, 16, 9, PAL['blush']),
        eye(-30, 1, -1), eye(30, 1, 1),
        stroke(NOSE_FRONT, LW), mouth(0, 1),
        hair(FRONT_FRINGE),
        shine('M -40 -204 C -12 -214 30 -213 59 -198 C 36 -203 0 -204 -27 -197 C -36 -196 -43 -199 -40 -204 Z'),
        strand('M 18 -204 C 4 -190 -8 -178 -22 -168'), strand('M 52 -194 C 50 -188 46 -184 42 -180'),
        brow(-30, 1, -1), brow(30, 1, 1),
    ]


# three-quarter, facing right: the face to the right, the near ear at -64, the part on the far side
S34_BACK = ('M 96 -128 C 104 -172 66 -214 2 -214 C -66 -214 -110 -176 -110 -118 C -110 -88 -105 -66 -97 -53 '
            'C -91 -43 -80 -41 -72 -50 C -66 -62 -62 -82 -58 -100 L 72 -120 C 78 -112 84 -104 88 -100 '
            'C 92 -96 97 -98 98 -106 C 99 -114 98 -122 96 -128 Z')
S34_FRINGE = ('M 96 -128 C 104 -172 66 -214 2 -214 C -66 -214 -110 -176 -110 -118 C -100 -121 -86 -124 -72 -127 '
              'C -60 -130 -48 -136 -40 -146 C -16 -158 24 -170 58 -186 C 74 -174 86 -158 92 -146 '
              'C 94 -140 95 -134 96 -128 Z')


def head_34_svg():
    return [
        hair(S34_BACK),
        morph(head_34(0), head_34(30), PAL['skin']),
        ellipse(-30, -67, 15, 9, PAL['blush']), ellipse(66, -68, 10, 8.5, PAL['blush']),
        ear(-64, -104, -1),
        eye(50, 0.74, 1, 0.35), eye(-6, 0.96, -1, 0.35),
        ink('M 70 -90 C 92 -80 98 -66 82 -61 C 76 -60 71 -62 68 -65 L 66 -80 Z', PAL['skin'], 0),
        stroke('M 70 -90 C 92 -80 98 -66 82 -61 C 76 -60 71 -62 68 -65', LW),
        mouth(42, 0.84),
        hair(S34_FRINGE),
        shine('M -52 -202 C -22 -214 22 -214 50 -202 C 26 -206 -10 -206 -40 -196 C -48 -194 -56 -198 -52 -202 Z'),
        strand('M 30 -202 C 12 -186 -4 -172 -20 -160'),
        brow(50, 0.72, 1), brow(-6, 0.95, -1),
    ]


# profile, facing right: the face to the right, the ear at -22, the fringe's near end on the forehead
SIDE_HAIR = ('M 82 -158 C 80 -190 48 -214 -4 -214 C -70 -214 -110 -172 -107 -110 C -105 -82 -96 -62 -83 -50 '
             'C -74 -42 -62 -42 -56 -52 C -50 -64 -46 -80 -40 -96 C -30 -114 -16 -126 2 -130 '
             'C 24 -134 44 -142 60 -152 C 68 -156 76 -158 82 -158 Z')


def head_side_svg():
    return [
        morph(head_side(0), head_side(30), PAL['skin']),
        ellipse(40, -66, 13, 9, PAL['blush']),
        stroke('M 78 -68 C 82 -70 84 -74 82 -78', LW * 0.8),
        eye(48, 0.5, -1, 0.8),
        mouth(53, 0.58),
        hair(SIDE_HAIR),
        shine('M -40 -204 C -10 -214 30 -210 56 -194 C 30 -202 -6 -204 -34 -196 C -42 -194 -46 -200 -40 -204 Z'),
        strand('M 20 -200 C 30 -186 40 -170 50 -156'),
        ear(-22, -104, -1.1),
        brow(46, 0.6, -1),
    ]


# from behind: all hair to the nape, the locks showing either side, and where it's drawn up into the
# ponytail (which hangs in front of it, a piece of its own)
BACK_HAIR = ('M 0 -214 ' + TOP + ' C 111 -92 106 -72 96 -58 C 90 -48 80 -46 74 -54 C 62 -46 44 -38 22 -35 '
             'C 8 -33 -8 -33 -22 -35 C -44 -38 -62 -46 -74 -54 C -80 -46 -90 -48 -96 -58 C -106 -72 -111 -92 -112 -118 '
             'C -114 -174 -72 -214 0 -214 Z')
S34BACK_HAIR = ('M 4 -214 C 70 -214 108 -176 104 -118 C 102 -92 96 -72 86 -60 C 78 -52 70 -56 66 -62 '
                'C 50 -48 30 -38 8 -36 C -14 -34 -40 -40 -62 -54 C -70 -42 -84 -40 -94 -50 C -106 -66 -112 -92 -112 -120 '
                'C -112 -176 -66 -214 4 -214 Z')


def head_back_svg():
    return [
        ink(SKULL_BACK, PAL['skin']),
        hair(BACK_HAIR),
        strand('M -70 -120 C -46 -140 -24 -156 -8 -164'), strand('M 70 -120 C 46 -140 24 -156 8 -164'),
        strand('M -40 -80 C -26 -112 -14 -142 -4 -160'), strand('M 40 -80 C 26 -112 14 -142 4 -160'),
    ]


def head_34back_svg():
    return [
        ink(SKULL_34BACK, PAL['skin']),
        hair(S34BACK_HAIR),
        strand('M -80 -118 C -60 -140 -44 -156 -30 -164'), strand('M 50 -124 C 20 -144 -4 -158 -20 -164'),
        strand('M -52 -78 C -44 -110 -36 -140 -28 -158'),
        ear(64, -104, 1),
    ]


HEADS = {'front': head_front_svg, '34': head_34_svg, 'side': head_side_svg, 'back': head_back_svg, '34back': head_34back_svg}


# ---------- the ponytail's tie ----------
TIE = 'M -14 -6 Q -15 -6 -15 -3 L -15 3 Q -15 6 -12 6 L 12 6 Q 15 6 15 3 L 15 -3 Q 15 -6 12 -6 Z'


# ---------- the sweater ----------
T = {v: tf(d, B, 1) for v, d in TORSO.items()}
T['34back'] = tf(TORSO['back'], B * 0.9, 1)
NECKLINE = {'front': 'M -31 -259 Q 0 -242 31 -259', '34': 'M -6 -259 Q 18 -244 40 -257', 'side': 'M 2 -261 Q 20 -252 38 -256',
            'back': 'M -30 -259 Q 0 -254 30 -259', '34back': 'M -26 -259 Q 2 -254 30 -259'}
PIN = {'front': (38, -190, 1), '34': (52, -190, 0.72)}       # where the Clapper pin is, and how turned away


def torso_svg(s, view):
    d = T[view]
    clip = s.clip(d)
    body = [ink(d, PAL['top'])]
    # the hem, ribbed, round the bottom
    ribs = [line([[x, -16], [x, 2]], 2, PAL['rib']) for x in range(-66, 70, 12)]
    body += [group([rect(-150, -20, 300, 40, PAL['cuff']), *ribs, line([[-150, -20], [150, -20]], LW * 0.8)], clip=clip), ink(d)]
    # the ribbed neckline, round the neck
    n = NECKLINE[view]
    body += [stroke(n, 10 + LW * 2), stroke(n, 10, PAL['cuff'])]
    if view in PIN:
        x, y, k = PIN[view]
        body.append(group([ink('M -12 -4 h 24 v 16 h -24 Z', PAL['pin'], 2.4), ink('M -12 -10 h 24 v 6 h -24 Z', PAL['tie'], 2.4)],
                          transform=f'translate({num(x)} {num(y)}) rotate(-7) scale({num(k)} 1)'))
    return body


# ---------- writing it ----------
def write(name, title, box, body):
    s = SVG(f'{NAME}: {title}', box)
    s.body = body(s) if callable(body) else body
    s.write(FOLDER, name)


def make():
    if os.path.exists(os.path.join(FOLDER, 'svg')):
        for f in os.listdir(os.path.join(FOLDER, 'svg')): os.remove(os.path.join(FOLDER, 'svg', f))
    for view, fn in HEADS.items():
        write(f'head-{view}.svg', f'head, {view}', HEAD_BOX, fn())
    for view in T:
        write(f'torso-{view}.svg', f'torso, {view}', TORSO_BOX, lambda s, view=view: torso_svg(s, view))
    for view, d in [('front', 'M -64 -12 L 64 -12 L 62 34 Q 0 46 -62 34 Z'), ('34', 'M -54 -12 L 62 -12 L 60 34 Q 6 44 -52 34 Z'),
                    ('side', 'M -42 -12 L 48 -12 L 46 32 Q 2 40 -40 32 Z')]:
        write(f'seat-{view}.svg', f'seat, {view}', '-110 -30 220 260', [ink(tf(d, B, 1), PAL['pants'])])
    write('neck.svg', 'neck', '-40 -50 80 80', [ink('M -22 20 L -22 -34 L 22 -34 L 22 20 Z', PAL['skin'])])
    for view, (d_up, d_sole) in SHOES['sneakers'].items():
        lace = {'front': 'M -10 14 L 10 20', '34': 'M 4 14 L 18 20', 'side': 'M 10 14 L 26 18', 'back': 'M -10 14 L 10 14'}[view]
        write(f'shoe-{view}.svg', f'shoe, {view}', '-40 -20 110 70', [ink(d_up, PAL['shoe']), ink(d_sole, PAL['sole'], LW * 0.8), stroke(lace, 2, '#9AA3B0')])
    write('tie.svg', 'the ponytail\'s tie', '-20 -10 40 20', [ink(TIE, PAL['tie'], LW * 0.8)])

    A, F, TH, SH = 150 * H, 138 * H, 196 * H, 190 * H
    arm = lambda bend: {'kit': 'noodle', 'a': A, 'b': F, 'bend': bend, 'w': 27 * B, 'w2': 25 * B, 'color': 'top', 'cuff': {'len': 20, 'color': 'cuff'}}
    leg = lambda bend: {'kit': 'noodle', 'a': TH, 'b': SH, 'bend': bend, 'w': 44 * B, 'w2': 40 * B, 'round': 0.3, 'color': 'pants'}
    shoes = {str(a): f'svg/shoe-{n}.svg' for a, n in [(0, 'front'), (1, '34'), (2, 'side'), (4, 'back')]}
    ang = lambda prefix: {str(a): f'svg/{prefix}-{n}.svg' for a, n in [(0, 'front'), (1, '34'), (2, 'side'), (3, '34back'), (4, 'back')]}
    r = lambda x: round(x, 2)
    bones = [
        {'name': 'hips', 'at': [0, r(-(TH + SH + 38))]},
        {'name': 'legL', 'parent': 'hips', 'at': [r(-34 * B), -4], 'len': r(TH), 'z': 0, 'piece': 'legL'},
        {'name': 'shinL', 'parent': 'legL', 'at': [0, r(TH)], 'len': r(SH), 'z': 0},
        {'name': 'footL', 'parent': 'shinL', 'at': [0, r(SH)], 'z': 0.1, 'piece': 'footL'},
        {'name': 'legR', 'parent': 'hips', 'at': [r(34 * B), -4], 'len': r(TH), 'z': 0, 'piece': 'legR'},
        {'name': 'shinR', 'parent': 'legR', 'at': [0, r(TH)], 'len': r(SH), 'z': 0},
        {'name': 'footR', 'parent': 'shinR', 'at': [0, r(SH)], 'z': 0.1, 'piece': 'footR'},
        {'name': 'pelvis', 'parent': 'hips', 'at': [0, 0], 'z': 1, 'piece': 'pelvis'},
        {'name': 'torso', 'parent': 'hips', 'at': [0, 0], 'z': 2, 'piece': 'torso'},
        {'name': 'neck', 'parent': 'torso', 'at': [0, -250], 'z': 1.5, 'piece': 'neck'},
        {'name': 'head', 'parent': 'neck', 'at': [0, -22], 'z': 4, 'piece': 'head'},
        # the ponytail: three bones from where it's tied, and the tie; placed round the head by the
        # head's angle (tags.turn.head), and swung by its chain's trail
        {'name': 'tail1', 'parent': 'head', 'at': [0, -170], 'len': 58, 'z': 0.5, 'piece': 'ponytail'},
        {'name': 'tail2', 'parent': 'tail1', 'at': [0, 58], 'len': 56, 'z': 0.5},
        {'name': 'tail3', 'parent': 'tail2', 'at': [0, 56], 'len': 48, 'z': 0.5},
        {'name': 'tie', 'parent': 'tail1', 'at': [0, 5], 'z': 0.51, 'piece': 'tie'},
        {'name': 'armL', 'parent': 'torso', 'at': [r(-72 * B), -236], 'len': r(A), 'z': 5.5, 'piece': 'armL'},
        {'name': 'foreL', 'parent': 'armL', 'at': [0, r(A)], 'len': r(F), 'z': 5.5},
        {'name': 'handL', 'parent': 'foreL', 'at': [0, r(F - 2)], 'z': 6, 'piece': 'handL'},
        {'name': 'armR', 'parent': 'torso', 'at': [r(72 * B), -236], 'len': r(A), 'z': 5.5, 'piece': 'armR'},
        {'name': 'foreR', 'parent': 'armR', 'at': [0, r(A)], 'len': r(F), 'z': 5.5},
        {'name': 'handR', 'parent': 'foreR', 'at': [0, r(F - 2)], 'z': 6, 'piece': 'handR'},
    ]
    pieces = {
        'head': {'angles': ang('head'), 'of': 'head'},
        'mouth': {'kit': 'mouthChart'},
        'neck': {'svg': 'svg/neck.svg'},
        'torso': {'angles': ang('torso'), 'of': 'body'},
        'pelvis': {'angles': {'0': 'svg/seat-front.svg', '1': 'svg/seat-34.svg', '2': 'svg/seat-side.svg'}, 'of': 'body', 'fallback': {'3': 1, '4': 0}},
        'ponytail': {'kit': 'ribbon', 'bones': ['tail1', 'tail2', 'tail3'], 'w': [26, 42, 34, 8], 'color': 'hair', 'edge': 1},
        'tie': {'svg': 'svg/tie.svg'},
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
        'ponytail': {'bones': ['tail1', 'tail2', 'tail3'], 'kind': 'hair',
                     'trail': {'posed': True, 'turn': 60, 'limit': 0.8, 'lag': 0.05, 'drag': 0.0013, 'flutter': 0.03, 'stiffness': 150, 'damping': 10}},
    }
    # where the ponytail is tied and how it hangs, by the head's angle: out to her left from the front,
    # behind the head at 3/4, on the back of it side on, and down the middle from behind
    tail = lambda x, y, r1, r2, r3, z: {'tail1.x': x, 'tail1.y': y, 'tail1.r': r1, 'tail2.r': r2, 'tail3.r': r3, 'tail1.z': z, 'tie.z': z + 0.01}
    head_turn = {
        '0': tail(62, -16, -1.15, 0.55, 0.45, 0.5),
        '1': tail(-70, 0, 0.75, -0.3, -0.25, 0.5),
        '2': tail(-98, 10, 0.4, -0.15, -0.15, 4.5),
        '3': tail(-30, 4, 0.15, 0, 0, 7),
        '4': tail(0, 4, 0.08, 0, 0, 7),
    }
    j = {
        'id': ID, 'version': 1, 'name': NAME, 'height': round(TH + SH + 38 + 250 + 22 + 250),
        'about': 'Pip, the kit\'s toon character, cut out: side-swept fringe, a ponytail that swings on its own, blue eyes, '
                 'a teal sweater with a Clapper pin, and white sneakers. Drawn on the cast\'s frame (Dex\'s heads, rig and clips).',
        'palette': {'skin': PAL['skin'], 'hair': PAL['hair'], 'top': PAL['top'], 'cuff': PAL['cuff'], 'pants': PAL['pants'],
                    'iris': PAL['iris'], 'mouth': PAL['mouth'], 'tongue': PAL['tongue']},
        'ink': INK, 'line': LW,
        'face': {'eye': {'rx': 27, 'ry': 30, 'pupil': 5, 'lid': 'skin', 'iris': 'iris', 'irisR': 12.5}, 'brow': {'color': PAL['brow']},
                 'mouth': {'w': 31, 'pal': {'mouth': 'mouth', 'tongue': 'tongue'}}},
        'bones': bones,
        'tags': {'root': 'hips', 'chest': 'torso', 'look': 'head', 'chains': chains,
                 'turn': {'offsets': {'1': {'neck.x': 8}, '2': {'neck.x': 12}, '3': {'neck.x': -4}}, 'head': head_turn}},
        'pieces': pieces,
        'limits': {'shinL': [-0.15, 2.9], 'shinR': [-0.15, 2.9]},
        'rest': {'armL.r': 0.1, 'foreL.r': -0.1, 'armR.r': -0.1, 'foreR.r': 0.1, 'handL.shape': 'relaxed', 'handR.shape': 'relaxed',
                 'legL.r': 0.02, 'legR.r': -0.02, 'shinL.r': 0, 'shinR.r': 0, **neutral_face(), 'mood.smile': 0.3},
        'poses': {
            'wave': {'armR.r': -2.5, 'foreR.r': -0.45, 'handR.shape': 'palm', 'handR.r': 0},
            'point': {'armR.r': -1.5, 'foreR.r': -0.05, 'handR.shape': 'point', 'handR.r': 0.1},
            'pointL': {'armL.r': 1.5, 'foreL.r': 0.05, 'handL.shape': 'point', 'handL.r': -0.1},
            'shrug': {'armL.r': 0.55, 'foreL.r': 1.3, 'armR.r': -0.55, 'foreR.r': -1.3, 'handL.shape': 'open', 'handR.shape': 'open', 'handL.r': 0.9, 'handR.r': -0.9},
            'thumbsUp': {'armR.r': -0.25, 'foreR.r': -1.35, 'handR.shape': 'thumb', 'handR.flip': 1, 'handR.r': 0.1},
            'hips': {'armL.r': 0.75, 'foreL.r': -1.6, 'armR.r': -0.75, 'foreR.r': 1.6, 'handL.shape': 'fist', 'handR.shape': 'fist', 'handL.r': 0.5, 'handR.r': -0.5},
            'cheer': {'armL.r': 2.7, 'foreL.r': 0.25, 'armR.r': -2.7, 'foreR.r': -0.25, 'handL.shape': 'fist', 'handR.shape': 'fist'},
        },
        'expressions': 'kit', 'clips': 'kit', 'life': {'seed': 3},
    }
    with open(os.path.join(FOLDER, 'character.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(j, f, indent=2); f.write('\n')
    loader = ("// Pip, cut out: the kit's toon Pip (characters/pip.js) redrawn as a cut-out stock character, with a\n"
              "// ponytail that swings on its own:\n"
              "// import { pip, pose, EXPR, POSES, REST } from '/@kit/characters/pip-cutout.js'.\n"
              "// Data, in characters/pip-cutout/, made by tools/make_pip.py on the cast's frame (Dex's rig, clips and\n"
              "// style). The ponytail swings as she nods, jumps and turns; pose(t, moves, { motion }) swings it as a\n"
              "// scene moves her too.\n"
              "import { loadCutout } from '../cutout.js';\n\n"
              "export const pip = await loadCutout(new URL('./pip-cutout/', import.meta.url).href);\n"
              "export const { rest: REST, poses: POSES, expressions: EXPR, palette: PAL } = pip;\n"
              "export const pose = pip.pose;\n")
    with open(os.path.join(KIT, 'web', 'characters', f'{ID}.js'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(loader)
    print('made', ID)


if __name__ == '__main__':
    make()
