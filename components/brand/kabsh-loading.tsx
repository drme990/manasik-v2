/**
 * Copied from the dashboard's agent training (TypingMark), owner 2026-10-11.
 *
 * What moves while Mr. Kabsh is writing: liquid in Manasik's green and navy,
 * sitting directly on the white chat area, that keeps becoming the things
 * Manasik offers:
 *
 *   the ram's head of Manasik's own seal -> a drop of water (wells) -> the
 *   Kaaba (umrah) -> a sheep (sacrifices) -> a Quran on its stand -> a sweet
 *   (children's sweets) -> a mosque -> ...
 *
 * Every picture goes through the same short act:
 *
 *   1. three loose pieces slam into each other and the picture bursts out of
 *      the collision, spreading and springing back;
 *   2. it rests for a moment, crouches, jumps, and falls;
 *   3. it hits the floor and breaks into three pieces that belong to what
 *      Manasik does: a heart (giving), the eight-pointed star of Manasik's own
 *      lattice, and a crescent;
 *   4. the pieces fly apart, pull back a little further, and rush together
 *      again: the next collision makes the next picture.
 *
 * How it is made:
 * - Every picture is built from the same twelve soft parts, four for each of
 *   the three pieces, so a picture really breaks into the pieces and the
 *   pieces really become the next picture: nothing fades into anything.
 * - Everything sits in one "liquid" layer (blurred, then sharpened), which is
 *   what makes parts flow into one silhouette and tear apart again.
 * - It stays wet throughout: every collision throws drops out of the new
 *   picture, which fall back into it; hitting the floor splashes; and each
 *   piece is chased into the next collision by the drops it trails.
 * - The ram's head is the one picture made differently, and it comes first:
 *   the collision pours out a stream that winds into the curl of the horn, the
 *   head opens out of that curl as it turns into place, and a light crosses it
 *   once it stands. It is the seal's own drawing, traced, and it is looked at
 *   for longer than the others.
 * - No movement is linear. Bursts start at full speed and brake; falls and
 *   collisions start slow and arrive at full speed; the crouch, the stretch in
 *   the air and the flattening on the floor are squash and stretch about the
 *   floor, not a change of size.
 * - The few details a silhouette needs to be read (an eye, the Kaaba's gold
 *   band and door, the lines of a page) are there only while it is a picture.
 */

const f2 = (n: number) => Number(n.toFixed(2));
const f4 = (n: number) => Number(n.toFixed(4));
/** A soft part: [centre x, centre y, width, height, corner radius, rotation in degrees]. */
type Part = [number, number, number, number, number, number];
type Product = 'ram' | 'sheep' | 'drop' | 'kaaba' | 'quran' | 'candy' | 'mosque';

const PART_COUNT = 12;
/** Parts a picture does not need wait inside its body, at the centre. */
const twelve = (parts: Part[]): Part[] => {
  const out = parts.slice(0, PART_COUNT);
  while (out.length < PART_COUNT) out.push([0, 0, 5, 5, 2.5, 0]);
  return out;
};

const PICTURES: Record<Product, Part[]> = {
  // The ram's head is drawn as itself (see RAM). Its parts wait inside it,
  // four for each piece it breaks into, too small to be seen.
  ram: [
    ...Array.from({ length: 4 }, (): Part => [-4.5, 13, 1.4, 1.4, 0.7, 0]),
    ...Array.from({ length: 4 }, (): Part => [1, 14.8, 1.4, 1.4, 0.7, 0]),
    ...Array.from({ length: 4 }, (): Part => [4.5, 5, 1.4, 1.4, 0.7, 0]),
  ],
  sheep: twelve([
    [2.5, 0, 25, 16, 8, 0], // body
    [-4.5, -6.5, 9.5, 9.5, 4.75, 0], // wool
    [3, -8, 10, 10, 5, 0],
    [10, -6, 9.5, 9.5, 4.75, 0],
    [-13.5, -2.5, 8.5, 11, 4.2, -18], // head
    [-9.8, -7.4, 6, 2.8, 1.4, 28], // ear
    [-5.5, 11, 3, 9.5, 1.5, 0], // legs
    [-1, 11, 3, 9.5, 1.5, 0],
    [7, 11, 3, 9.5, 1.5, 0],
    [11.5, 11, 3, 9.5, 1.5, 0],
    [15.8, -1.5, 4.6, 4.6, 2.3, 0], // tail
  ]),
  // The drop's own outline is drawn over these (see DROP): they are the
  // material inside it, which is what breaks and what arrives.
  drop: twelve([
    [0, 5.5, 19.5, 19.5, 9.75, 0],
    [0, -3.5, 10, 10, 5, 0],
    [0, -9.5, 5, 6, 2.5, 0],
  ]),
  kaaba: twelve([[0, 1, 25, 25, 1.2, 0]]),
  quran: twelve([
    [-7.6, -3.5, 15.5, 17, 1.6, 9], // the two pages of the open book
    [7.6, -3.5, 15.5, 17, 1.6, -9],
    [0, -1.2, 3, 16, 1.5, 0], // spine
    [-5.5, 11.5, 3, 16, 1.5, 38], // the stand it rests on
    [5.5, 11.5, 3, 16, 1.5, -38],
  ]),
  candy: twelve([
    [0, 0, 17, 17, 8.5, 0], // the sweet
    [-11, 0, 6, 3.4, 1.5, 0], // its wrapper, twisted at both ends
    [-16, -4, 8.5, 3.6, 1.6, 42],
    [-16, 4, 8.5, 3.6, 1.6, -42],
    [-17.5, 0, 6, 3.4, 1.5, 0],
    [11, 0, 6, 3.4, 1.5, 0],
    [16, -4, 8.5, 3.6, 1.6, -42],
    [16, 4, 8.5, 3.6, 1.6, 42],
    [17.5, 0, 6, 3.4, 1.5, 0],
  ]),
  mosque: twelve([
    [0, 9, 27, 12, 1.2, 0], // hall
    [0, 0.5, 17.5, 17.5, 8.75, 0], // dome
    [0, -10.2, 2.4, 6.5, 1.2, 0], // finial
    [-16.5, 2.5, 4.4, 25, 1.6, 0], // minarets
    [16.5, 2.5, 4.4, 25, 1.6, 0],
    [-16.5, -11.5, 2.2, 6, 1.1, 0],
    [16.5, -11.5, 2.2, 6, 1.1, 0],
    [-16.5, -6.5, 6.4, 2.4, 1, 0], // balconies
    [16.5, -6.5, 6.4, 2.4, 1, 0],
  ]),
};
const ORDER: Product[] = ['ram', 'drop', 'kaaba', 'sheep', 'quran', 'candy', 'mosque'];

// The three loose pieces: a heart, an eight-pointed star and a crescent. Each
// is drawn as itself (see Emblem) around four of the twelve parts, which wait
// inside it as a small core, so the picture's own material is what breaks into
// the pieces and what the pieces carry back into the next picture.
type Spot = [number, number];
type Piece = [Part, Part, Part];
type Spots = [Spot, Spot, Spot];
/** Where the three pieces are just after the fall, flown apart, and pulled back. */
const BROKEN_AT: Spots = [[-14, 15], [1, 16], [15, 15.5]];
const APART_AT: Spots = [[-20, -3], [2, -14], [20, 4]];
const WOUND_AT: Spots = [[-23, -3.5], [2.3, -17.2], [23, 4.6]];
/** How far each piece is turned at those three moments, and when it is not there. */
const TURNS: [number, number, number, number][] = [
  [0, -16, -8, 10],
  [0, 30, 68, 135],
  [0, -40, -18, 14],
];
/** Just after the fall: the parts are flattened against the floor, thrown to the sides. */
const BROKEN: Piece = [
  [-14, 15, 12, 8, 4, 0],
  [1, 16, 8, 6.5, 2.5, 15],
  [15, 15.5, 11, 5, 2.5, -8],
];
// The core inside each piece: the parts drawn so small that the piece is all
// that is seen.
const core = (spot: Spot): Part => [spot[0], spot[1], 1.4, 1.4, 0.7, 0];
const APART: Piece = [core(APART_AT[0]), core(APART_AT[1]), core(APART_AT[2])];
const WOUND: Piece = [core(WOUND_AT[0]), core(WOUND_AT[1]), core(WOUND_AT[2])];

// The outlines of the three pieces, each drawn around its own centre.
const HEART =
  'M0 5.4C-7.4 0.6-6.4-5.4-3-5.4C-1.4-5.4 0-4.2 0-3C0-4.2 1.4-5.4 3-5.4C6.4-5.4 7.4 0.6 0 5.4Z';
const STAR = (() => {
  // Deeper points than the lattice's own star, so they survive at this size.
  const outer = 7;
  const inner = 4.1;
  const points: string[] = [];
  for (let k = 0; k < 16; k += 1) {
    const angle = (k * Math.PI) / 8;
    const radius = k % 2 === 0 ? outer : inner;
    points.push(`${f2(radius * Math.cos(angle))} ${f2(radius * Math.sin(angle))}`);
  }
  return `M${points.join('L')}Z`;
})();
// Its back is to the outside, where the drops it trails are.
const CRESCENT = 'M-2.9-6A6.7 6.7 0 1 1-2.9 6A5.2 5.2 0 1 0-2.9-6Z';
/** A drop of water: a point that widens, in one curve, into the round below it. */
const DROP =
  'M0-16.6C3.4-9.8 10.6-3.6 10.6 5.4A10.6 10.6 0 1 1-10.6 5.4C-10.6-3.6-3.4-9.8 0-16.6Z';
const EMBLEMS = [HEART, STAR, CRESCENT];
/** The collision: everything in one point. */
const CORE: Part = [0, 2, 7, 7, 3.5, 0];
const CORE_AT: Spot = [CORE[0], CORE[1]];
/** Where the floor is: pictures stand on it, squash against it, and splash off it. */
const FLOOR = 20;
const pieceOf = (index: number) => Math.min(2, Math.floor(index / 4));

// The ram's head of Manasik's seal, traced from the seal itself: the head
// alone, without the ring and the words around it.
const RAM =
  'M-7.5-8.8 L-7.9-8.6 L-8.4-8.3 L-9.3-7.4 L-10.1-6.3 L-10.7-5.1 L-11-4.3 L-11.1-3.7 L-11.2-3.2 L-11.3-2.9 L-11.3-1.3 L-11.1-0.8 L-11.1-0.2 L-10.8 0.7 L-10.1 2.2 L-9.4 3 L-8.4 3.9 L-7 4.7 L-5.7 5.2 L-5.3 5.3 L-4.7 5.5 L-4 5.5 L-3.4 5.7 L-3.3 5.7 L-3.6 5.9 L-5.4 5.9 L-5.7 5.8 L-6.2 5.7 L-6.8 5.6 L-7.9 4.9 L-8.1 5 L-9.3 7.1 L-9.4 7.5 L-9.8 8.2 L-10 8.7 L-10.2 9 L-10.3 9.4 L-11 10.7 L-11.2 11.4 L-11.2 11.6 L-11.1 11.8 L-10.3 12.8 L-9.4 13.9 L-8 15.1 L-7 15.9 L-5.9 16.6 L-4.2 17.4 L-3.5 17.6 L-3.1 17.8 L-1.8 18.2 L-1.4 18.2 L-0.5 18.5 L0.1 18.5 L0.4 18.6 L3.6 18.6 L4.1 18.5 L4.5 18.5 L6.2 18.1 L7.8 17.6 L8.6 17.2 L9.2 16.9 L9.5 16.7 L10.1 16.4 L10.3 16.2 L10.2 16.1 L9.8 16.1 L9.4 16 L9 16 L8.5 15.8 L6.7 14.9 L5.9 14.4 L4.8 13.3 L4.5 12.9 L4.1 11.8 L4.1 11.1 L3.8 10.8 L3.1 10.7 L2.4 10.7 L2.1 10.6 L1.6 10.7 L1.1 10.7 L0.1 11 L-0.7 11.3 L-1.2 11.6 L-1.6 12 L-1.8 12.1 L-1.9 12.1 L-1.5 11.4 L-1 10.9 L-0.7 10.7 L-0.3 10.3 L0 10.2 L0.9 9.7 L1.4 9.5 L1.9 9.5 L2.3 9.4 L4.1 9.4 L4.8 9.6 L5.2 9.9 L5.7 10.3 L6 11 L6 11.5 L6.5 12.3 L6.8 12.8 L7.2 13.2 L7.7 13.5 L7.9 13.6 L8 13.5 L8 13.3 L7.9 12.9 L8 12.4 L8.2 12 L8.5 11.7 L9.2 11.5 L10.3 10.4 L11 9.4 L11.1 8.9 L11.2 8.5 L11.3 8.2 L11.3 7.6 L11 6.6 L10.3 5.4 L10.2 5 L9 2.9 L8.4 2.2 L8.3 1.8 L7.9 1.5 L7.3 0.5 L6.9 0.1 L6.4-0.8 L6.5-0.8 L6.7-0.8 L7.4-0.1 L7.7-0 L7.8-0.2 L8.3-1.1 L8.7-2.4 L8.8-2.9 L8.9-3.3 L8.9-3.6 L8.8-3.9 L8.7-4.5 L8.2-5.7 L7.4-6.5 L7-6.8 L6.5-7 L6.1-7 L5.8-7.1 L4.8-7.1 L4.5-7 L4-7 L3.3-6.7 L3-6.7 L1.6-8.1 L0-9.2 L-2.1-9.8 L-2.5-9.9 L-2.9-10 L-3.9-10 L-4.3-9.9 L-4.9-9.8 L-6.5-9.3ZM-2.1-3.1 L-2-3 L-2.1-2.8 L-2.7-2.7 L-3.2-2.7 L-3.7-2.5 L-3.8-2.3 L-3.8-1.9 L-3.6-1 L-3-0 L-2.3 0.6 L-1.6 1.2 L-1.6 1.3 L-1.6 1.3 L-2.3 1.1 L-2.9 0.8 L-3.6 0.3 L-3.9 0.2 L-4.6 0.8 L-5.3 1.6 L-5.7 1.9 L-5.8 2.1 L-6.5 2.8 L-6.7 2.8 L-7 2.4 L-7.3 1.7 L-7.5 1.2 L-7.5 0.8 L-7.6 0.5 L-7.5-0.6 L-7.1-1.5 L-6.8-1.9 L-6-2.7 L-5.5-3.1 L-5.2-3.2 L-4.2-3.4 L-3.2-3.4Z';
/** The middle of the curl of its horn: where the head is poured from. */
const HORN: Spot = [-4.5, -0.45];
/** The liquid gathered there, just before it is poured, and when it is all poured out. */
const HORN_FULL: Part = [HORN[0], HORN[1], 6.4, 6.4, 3.2, 0];
const HORN_EMPTY: Part = [HORN[0], HORN[1], 1.4, 1.4, 0.7, 0];
/**
 * The stream that winds out of that middle along the horn: the way the horn
 * itself curls, from its heart round the back of the head and over the top.
 * [angle in degrees, distance from the middle]
 */
const SWIRL_WAY: [number, number][] = [
  [40, 0.5],
  [70, 1.6],
  [100, 3.1],
  [130, 4.4],
  [160, 4.8],
  [190, 4.95],
  [220, 5.4],
  [250, 5.9],
  [280, 6.3],
  [310, 6.7],
  [338, 7.1],
];
const SWIRL = (() => {
  // A smooth line through the way's points, and how long it is.
  const points: Spot[] = [];
  for (let k = 0; k < SWIRL_WAY.length - 1; k += 1) {
    const [a1, r1] = SWIRL_WAY[k];
    const [a2, r2] = SWIRL_WAY[k + 1];
    for (let step = 0; step < 6; step += 1) {
      const t = step / 6;
      const angle = ((a1 + (a2 - a1) * t) * Math.PI) / 180;
      const radius = r1 + (r2 - r1) * t;
      points.push([HORN[0] + radius * Math.cos(angle), HORN[1] + radius * Math.sin(angle)]);
    }
  }
  let length = 0;
  for (let k = 1; k < points.length; k += 1) {
    length += Math.hypot(points[k][0] - points[k - 1][0], points[k][1] - points[k - 1][1]);
  }
  return {
    d: `M${points.map((point) => `${f2(point[0])} ${f2(point[1])}`).join('L')}`,
    length: f2(length + 0.5),
  };
})();

// One act, in seconds from the collision that makes the picture.
interface Times {
  burst: number; // drops are thrown out of the collision
  out: number; // ...and are at their farthest
  formed: number; // the picture has burst out of the collision
  rebound: number; // ...sprung back past its shape
  settled: number; // ...and come to rest
  crouch: number; // it starts to gather itself
  launch: number; // lowest point of the crouch
  stretch: number; // leaving the floor
  apex: number; // top of the jump
  falling: number; // just above the floor
  land: number; // it hits the floor
  broken: number; // the three pieces are thrown to the sides
  apart: number; // ...have flown apart
  wound: number; // ...and pulled back
  slam: number; // the next collision
}
const USUAL: Times = {
  burst: 0,
  out: 0.16,
  formed: 0.16,
  rebound: 0.25,
  settled: 0.36,
  crouch: 0.92,
  launch: 1.04,
  stretch: 1.11,
  apex: 1.3,
  falling: 1.44,
  land: 1.48,
  broken: 1.64,
  apart: 2.0,
  wound: 2.14,
  slam: 2.34,
};
// The ram's head takes longer to arrive (it is drawn in, not burst out) and
// stands longer before it jumps.
const RAM_DRAWN = 0.84;
const RAM_ADMIRED = 0.8;
const RAM_TIMES: Times = {
  burst: 0.5,
  out: 0.72,
  formed: USUAL.formed + RAM_DRAWN,
  rebound: USUAL.rebound + RAM_DRAWN,
  settled: USUAL.settled + RAM_DRAWN,
  crouch: USUAL.crouch + RAM_DRAWN + RAM_ADMIRED,
  launch: USUAL.launch + RAM_DRAWN + RAM_ADMIRED,
  stretch: USUAL.stretch + RAM_DRAWN + RAM_ADMIRED,
  apex: USUAL.apex + RAM_DRAWN + RAM_ADMIRED,
  falling: USUAL.falling + RAM_DRAWN + RAM_ADMIRED,
  land: USUAL.land + RAM_DRAWN + RAM_ADMIRED,
  broken: USUAL.broken + RAM_DRAWN + RAM_ADMIRED,
  apart: USUAL.apart + RAM_DRAWN + RAM_ADMIRED,
  wound: USUAL.wound + RAM_DRAWN + RAM_ADMIRED,
  slam: USUAL.slam + RAM_DRAWN + RAM_ADMIRED,
};
const timesOf = (product: Product): Times => (product === 'ram' ? RAM_TIMES : USUAL);
/** When each act begins, and how long the whole story is. */
const STARTS: number[] = [];
const SECONDS = ORDER.reduce((sum, product) => {
  STARTS.push(sum);
  return sum + timesOf(product).slam;
}, 0);
const DURATION = `${f2(SECONDS)}s`;

// How a movement gets from one key to the next.
const HOLD = '0 0 1 1';
const BURST = '0.05 0.9 0.2 1'; // full speed at once, then brakes
const THROWN = '0.1 0.8 0.25 1'; // thrown: fast, then slowing
const DRIFT = '0.25 0.6 0.35 1'; // flying on, losing speed
const SWAY = '0.4 0 0.6 1'; // a gentle there and back
const RUSH = '0.85 0 1 0.5'; // slow to start, arrives at full speed
const RISE = '0.15 0.7 0.3 1'; // jumps fast, hangs at the top
const FALL = '0.7 0 1 0.7'; // gravity
const UNFURL = '0.3 0 0.15 1'; // opens slowly, then all at once, and eases into place

type Value = string | number;
/** [second within the act, value, how it gets there] */
type Key = [number, Value, string];
interface Track {
  keyTimes: string;
  values: string;
  keySplines: string;
}

/**
 * A value's whole story: `first` at the start, then, for every picture in
 * turn, the keys of its act, timed by that act's own clock. Every act must end
 * at its `slam`, and the last act ends on `first` again, so the loop has no
 * seam.
 */
function track(first: Value, act: (product: Product, at: Times) => Key[]): Track {
  const times: number[] = [0];
  const values: Value[] = [first];
  const splines: string[] = [];
  ORDER.forEach((product, index) => {
    for (const [second, value, spline] of act(product, timesOf(product))) {
      times.push(Math.min(1, (STARTS[index] + second) / SECONDS));
      values.push(value);
      splines.push(spline);
    }
  });
  times[times.length - 1] = 1;
  values[values.length - 1] = first;
  return {
    keyTimes: times.map(f4).join(';'),
    values: values.join(';'),
    keySplines: splines.join(';'),
  };
}

/** An attribute that follows a track. */
function Told({ attribute, story }: { attribute: string; story: Track }) {
  return (
    <animate
      attributeName={attribute}
      dur={DURATION}
      repeatCount="indefinite"
      calcMode="spline"
      keyTimes={story.keyTimes}
      keySplines={story.keySplines}
      values={story.values}
    />
  );
}

/** A transform that follows a track. */
function Moved({ type, story }: { type: 'translate' | 'scale' | 'rotate'; story: Track }) {
  return (
    <animateTransform
      attributeName="transform"
      type={type}
      dur={DURATION}
      repeatCount="indefinite"
      calcMode="spline"
      keyTimes={story.keyTimes}
      keySplines={story.keySplines}
      values={story.values}
    />
  );
}

/** The story of one of the twelve parts, for one of its six numbers. */
function partStory(index: number, value: (part: Part) => Value): Track {
  const piece = pieceOf(index);
  return track(value(CORE), (product, at) => {
    const picture = value(PICTURES[product][index]);
    // The ram is not burst out: the collision gathers in the middle of the
    // horn and is poured out of it (see the swirl), until nothing is left.
    const poured: Key[] =
      product === 'ram'
        ? [
            [0.12, value(HORN_FULL), BURST],
            [at.burst, value(HORN_EMPTY), SWAY],
          ]
        : [];
    return [
      ...poured,
      [at.formed, picture, BURST],
      [at.land, picture, HOLD],
      [at.broken, value(BROKEN[piece]), THROWN],
      [at.apart, value(APART[piece]), DRIFT],
      [at.wound, value(WOUND[piece]), SWAY],
      [at.slam, value(CORE), RUSH],
    ];
  });
}

/** One of the twelve parts. */
function SoftPart({ index }: { index: number }) {
  return (
    <rect x={-3.5} y={-1.5} width={7} height={7} rx={3.5}>
      <Told attribute="x" story={partStory(index, (p) => f2(p[0] - p[2] / 2))} />
      <Told attribute="y" story={partStory(index, (p) => f2(p[1] - p[3] / 2))} />
      <Told attribute="width" story={partStory(index, (p) => p[2])} />
      <Told attribute="height" story={partStory(index, (p) => p[3])} />
      <Told attribute="rx" story={partStory(index, (p) => p[4])} />
      <Moved type="rotate" story={partStory(index, (p) => `${p[5]} ${p[0]} ${p[1]}`)} />
    </rect>
  );
}

// ─── Drops ────────────────────────────────────────────────────────────────────

const LATE = '0.95 0 1 0.35'; // as RUSH, but a moment behind
const LATER = '0.98 0 1 0.2';

interface DropStory {
  x: Track;
  y: Track;
  r: Track;
}

/**
 * Thrown out at `angle` (degrees), `reach` far, as the picture bursts out,
 * then drawn back into it. The ram's head throws them from the middle of its
 * horn, as it opens.
 */
function thrownOut(angle: number, reach: number, size: number): DropStory {
  const dx = Math.cos((angle * Math.PI) / 180);
  const dy = Math.sin((angle * Math.PI) / 180);
  const from = (product: Product): Spot => (product === 'ram' ? HORN : CORE_AT);
  const waiting = (at: Times, value: Value): Key[] => (at.burst > 0 ? [[at.burst, value, HOLD]] : []);
  return {
    x: track(CORE[0], (product, at) => [
      ...waiting(at, from(product)[0]),
      [at.out, f2(from(product)[0] + reach * dx), BURST],
      [at.settled + 0.2, f2(from(product)[0] + reach * 0.32 * dx), RUSH],
      [at.slam, CORE[0], HOLD],
    ]),
    // It comes back lower than it left: it falls as it returns.
    y: track(CORE[1], (product, at) => [
      ...waiting(at, from(product)[1]),
      [at.out, f2(from(product)[1] + reach * dy), BURST],
      [at.settled + 0.2, f2(from(product)[1] + reach * 0.3 * dy + 2.5), RUSH],
      [at.slam, CORE[1], HOLD],
    ]),
    r: track(0, (_product, at) => [
      ...waiting(at, 0),
      [at.burst + 0.03, size, HOLD],
      [at.out, f2(size * 0.9), BURST],
      [at.settled + 0.2, f2(size * 0.5), RUSH],
      [at.settled + 0.24, 0, HOLD],
      [at.slam, 0, HOLD],
    ]),
  };
}

/** Splashed off the floor when the picture lands: up and out from `from`, then down again. */
function splashed(from: number, height: number, size: number): DropStory {
  return {
    x: track(0, (_product, at) => [
      [at.land, from, HOLD],
      [at.land + 0.17, f2(from * 2.3), THROWN],
      [at.land + 0.44, f2(from * 2.9), HOLD],
      [at.slam, 0, HOLD],
    ]),
    y: track(FLOOR - 1, (_product, at) => [
      [at.land, FLOOR - 1, HOLD],
      [at.land + 0.17, FLOOR - 1 - height, RISE],
      [at.land + 0.44, FLOOR + 1, FALL],
      [at.slam, FLOOR - 1, HOLD],
    ]),
    r: track(0, (_product, at) => [
      [at.land, 0, HOLD],
      [at.land + 0.03, size, HOLD],
      [at.land + 0.17, f2(size * 0.85), THROWN],
      [at.land + 0.44, f2(size * 0.45), FALL],
      [at.land + 0.49, 0, HOLD],
      [at.slam, 0, HOLD],
    ]),
  };
}

/** Left behind by a piece as it rushes in, and arriving just after it. */
function trailing(piece: number, lag: string, size: number): DropStory {
  // It starts just behind the piece, on the side away from the collision.
  const behind = (spot: Spot, axis: 0 | 1) => f2(spot[axis] + (spot[axis] - CORE[axis]) * 0.14);
  return {
    x: track(CORE[0], (_product, at) => [
      [at.apart, behind(APART_AT[piece], 0), HOLD],
      [at.wound, behind(WOUND_AT[piece], 0), SWAY],
      [at.slam, CORE[0], lag],
    ]),
    y: track(CORE[1], (_product, at) => [
      [at.apart, behind(APART_AT[piece], 1), HOLD],
      [at.wound, behind(WOUND_AT[piece], 1), SWAY],
      [at.slam, CORE[1], lag],
    ]),
    r: track(0, (_product, at) => [
      [at.wound, 0, HOLD],
      [at.wound + 0.06, size, SWAY],
      [at.slam, 0, LATER],
    ]),
  };
}

const DROPS: DropStory[] = [
  thrownOut(-152, 21, 2.5),
  thrownOut(-100, 23, 2.1),
  thrownOut(-48, 22, 2.7),
  thrownOut(8, 20, 2),
  thrownOut(172, 19, 2.2),
  splashed(-9, 13, 2.3),
  splashed(-4.5, 19, 1.8),
  splashed(5, 17, 2),
  splashed(9.5, 11, 2.4),
  trailing(0, LATE, 2.1),
  trailing(0, LATER, 1.5),
  trailing(1, LATE, 2),
  trailing(1, LATER, 1.4),
  trailing(2, LATE, 2.1),
  trailing(2, LATER, 1.5),
];

function Drop({ story }: { story: DropStory }) {
  return (
    <circle cx={0} cy={0} r={0}>
      <Told attribute="cx" story={story.x} />
      <Told attribute="cy" story={story.y} />
      <Told attribute="r" story={story.r} />
    </circle>
  );
}

/**
 * One of the three pieces, drawn as itself. It is not there while a picture
 * is: it grows out of the puddle the fall leaves, flies with its core, and is
 * swallowed by the collision.
 */
function Emblem({ piece }: { piece: number }) {
  const spotText = (spot: Spot) => `${spot[0]} ${spot[1]}`;
  const turn = TURNS[piece];
  const place = track(spotText(CORE_AT), (_product, at) => [
    [at.land, spotText(CORE_AT), HOLD],
    [at.broken, spotText(BROKEN_AT[piece]), THROWN],
    [at.apart, spotText(APART_AT[piece]), DRIFT],
    [at.wound, spotText(WOUND_AT[piece]), SWAY],
    [at.slam, spotText(CORE_AT), RUSH],
  ]);
  const size = track(0.3, (_product, at) => [
    // Swallowed by the collision at once, however long the picture takes to arrive.
    [USUAL.formed, 0, BURST],
    [at.broken, 0, HOLD],
    [at.apart, 1, DRIFT],
    [at.wound, 1, SWAY],
    [at.slam, 0.3, RUSH],
  ]);
  const turned = track(turn[0], (_product, at) => [
    [at.land, turn[0], HOLD],
    [at.broken, turn[1], THROWN],
    [at.apart, turn[2], DRIFT],
    [at.wound, turn[3], SWAY],
    [at.slam, turn[0], RUSH],
  ]);
  return (
    <g>
      <Moved type="translate" story={place} />
      <g>
        <Moved type="rotate" story={turned} />
        <g transform="scale(0.3)">
          <Moved type="scale" story={size} />
          <path d={EMBLEMS[piece]} />
        </g>
      </g>
    </g>
  );
}

// The drop's outline: there from the burst that makes the drop until it hits the floor.
const DROP_SIZE = track(0, (product, at) => {
  const on = product === 'drop' ? 1 : 0;
  return [
    [at.formed, on, BURST],
    [at.land, on, HOLD],
    [at.land + 0.07, 0, THROWN],
    [at.slam, 0, HOLD],
  ];
});

// The jump: the whole picture leaves the floor and comes back to it.
const JUMP = track('0 0', (_product, at) => [
  [at.crouch, '0 0', HOLD],
  [at.launch, '0 0.6', SWAY],
  [at.apex, '0 -10', RISE],
  [at.land, '0 0', FALL],
  [at.slam, '0 0', HOLD],
]);
// Squash and stretch, about the floor: [wider, taller].
const SQUASH = track('1 1', (_product, at) => [
  ...(at.burst > 0 ? ([[at.burst, '1 1', HOLD]] as Key[]) : []),
  [at.formed, '1.15 0.9', BURST], // the burst spreads it
  [at.rebound, '0.94 1.07', SWAY], // it springs back past its shape...
  [at.settled, '1.04 0.97', SWAY], // ...and wobbles like something wet
  [at.settled + 0.13, '0.985 1.015', SWAY],
  [at.settled + 0.26, '1 1', SWAY],
  [at.crouch, '1 1', HOLD],
  [at.launch, '1.13 0.84', SWAY], // crouch
  [at.stretch, '0.9 1.14', THROWN], // long as it leaves the floor
  [at.apex, '1 1', RISE],
  [at.falling, '0.92 1.12', FALL], // long again as it falls
  [at.land, '1.24 0.74', HOLD], // flat against the floor
  [at.broken, '1 1', THROWN],
  [at.slam, '1 1', HOLD],
]);

/** Seen only while `product` is a picture: from its burst until it hits the floor. */
const shownWhile = (product: Product, shown: number): Track =>
  track(0, (now, at) => {
    const on = now === product ? shown : 0;
    return [
      [at.formed, 0, HOLD],
      [at.rebound, on, HOLD],
      [at.land, on, HOLD],
      [at.land + 0.05, 0, HOLD],
      [at.slam, 0, HOLD],
    ];
  });

// ─── The ram's head ──────────────────────────────────────────────────────────

/** A story told only in the ram's act; at rest (`first`) in every other. */
const onlyRam = (first: Value, keys: (at: Times) => Key[]): Track =>
  track(first, (product, at) => (product === 'ram' ? keys(at) : [[at.slam, first, HOLD]]));
const POURING = 0.04; // the stream starts...
const POURED = 0.62; // ...and has wound the whole horn
// The stream is drawn along its way, then lost under the head that opens over it.
const SWIRL_DRAWN = onlyRam(SWIRL.length, (at) => [
  [POURING, SWIRL.length, HOLD],
  [POURED, 0, DRIFT],
  [at.formed, 0, HOLD],
  [at.formed + 0.02, SWIRL.length, HOLD],
  [at.slam, SWIRL.length, HOLD],
]);
const SWIRL_WIDTH = onlyRam(0, (at) => [
  [POURING, 0, HOLD],
  [POURING + 0.08, 3.6, THROWN],
  [at.out, 3.6, HOLD],
  [at.formed, 0, SWAY],
  [at.slam, 0, HOLD],
]);
// The head opens out of the curl: it grows from the middle of the horn...
const RAM_SIZE = onlyRam(0, (at) => [
  [at.burst, 0, HOLD],
  [at.formed, 1, UNFURL],
  [at.land, 1, HOLD],
  [at.land + 0.07, 0, THROWN],
  [at.slam, 0, HOLD],
]);
// ...turning into place as it does, a little too far, and back.
const RAM_TURN = onlyRam(-110, (at) => [
  [at.burst, -110, HOLD],
  [at.formed, 7, UNFURL],
  [at.rebound, -3, SWAY],
  [at.settled, 0, SWAY],
  [at.land, 0, HOLD],
  [at.slam, -110, HOLD],
]);
// Once it stands, a light crosses it.
const RAM_LIGHT = onlyRam('-34 0', (at) => [
  [at.settled + 0.18, '-34 0', HOLD],
  [at.settled + 0.88, '34 0', SWAY],
  // It goes back to its side only when the head is no longer there.
  [at.land + 0.1, '34 0', HOLD],
  [at.land + 0.12, '-34 0', HOLD],
  [at.slam, '-34 0', HOLD],
]);

// The shadow on the floor: as wide as what is above it, fainter when that is in the air.
const shadowWidth = (product: Product) =>
  product === 'ram' || product === 'drop' || product === 'kaaba' || product === 'quran' ? 12 : 17;
const SHADOW_WIDTH = track(5, (product, at) => [
  [at.formed, shadowWidth(product), BURST],
  [at.launch, shadowWidth(product), HOLD],
  [at.apex, f2(shadowWidth(product) * 0.6), RISE],
  [at.land, shadowWidth(product), FALL],
  [at.broken, 19, THROWN],
  [at.apart, 10, DRIFT],
  [at.wound, 9, SWAY],
  [at.slam, 5, RUSH],
]);
const SHADOW_DEPTH = track(1, (_product, at) => [
  [at.launch, 1, HOLD],
  [at.apex, 0.45, RISE],
  [at.land, 1, FALL],
  [at.broken, 1, HOLD],
  [at.apart, 0.4, DRIFT],
  [at.wound, 0.35, SWAY],
  [at.slam, 1, RUSH],
]);

/** On the website: the loading mark. Its colours follow the theme (the navy part turns light on the dark site). */
export default function KabshLoading({ size = 84, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={Math.round((size * 78) / 84)} viewBox="-30 -31 60 56" aria-hidden className={className}>
      <defs>
        <filter id="kabsh-liquid" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.15" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 17 -6.5"
          />
        </filter>
        <filter id="kabsh-liquid-fine" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.45" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 11 -4"
          />
        </filter>
        <linearGradient
          id="kabsh-liquid-colour"
          gradientUnits="userSpaceOnUse"
          x1="-14"
          y1="-14"
          x2="14"
          y2="14"
        >
          <stop offset="0" style={{ stopColor: 'var(--kabsh-1, #3fc27e)' }} />
          <stop offset="0.55" style={{ stopColor: 'var(--kabsh-2, #1c7f6a)' }} />
          <stop offset="1" style={{ stopColor: 'var(--kabsh-3, #0b2a63)' }} />
          <animateTransform
            attributeName="gradientTransform"
            type="rotate"
            from="0"
            to="360"
            dur="9s"
            repeatCount="indefinite"
          />
        </linearGradient>
        <linearGradient id="kabsh-ram-light" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="kabsh-ram-shape">
          <path d={RAM} clipRule="evenodd" />
        </clipPath>
        <radialGradient id="kabsh-liquid-shadow">
          <stop offset="0" style={{ stopColor: 'var(--kabsh-shadow, #0a1d47)' }} stopOpacity="0.22" />
          <stop offset="1" style={{ stopColor: 'var(--kabsh-shadow, #0a1d47)' }} stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx={0} cy={22} rx={5} ry={2.2} fill="url(#kabsh-liquid-shadow)">
        <Told attribute="rx" story={SHADOW_WIDTH} />
        <Told attribute="opacity" story={SHADOW_DEPTH} />
      </ellipse>

      {/* The jump, then squash and stretch about the floor. */}
      <g>
        <Moved type="translate" story={JUMP} />
        <g transform={`translate(0 ${FLOOR})`}>
          <g>
            <Moved type="scale" story={SQUASH} />
            <g transform={`translate(0 ${-FLOOR})`}>
              <g filter="url(#kabsh-liquid)" fill="url(#kabsh-liquid-colour)">
                {Array.from({ length: PART_COUNT }, (_, index) => (
                  <SoftPart key={index} index={index} />
                ))}
                {DROPS.map((story, index) => (
                  <Drop key={index} story={story} />
                ))}
                <path d={DROP} transform="scale(0)">
                  <Moved type="scale" story={DROP_SIZE} />
                </path>
                {/* The stream the ram's head is poured from, winding along its horn. */}
                <path
                  d={SWIRL.d}
                  fill="none"
                  stroke="url(#kabsh-liquid-colour)"
                  strokeWidth={0}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={SWIRL.length}
                  strokeDashoffset={SWIRL.length}
                >
                  <Told attribute="stroke-dashoffset" story={SWIRL_DRAWN} />
                  <Told attribute="stroke-width" story={SWIRL_WIDTH} />
                </path>
              </g>
              {/* The three pieces keep their own, finer, edge. */}
              <g filter="url(#kabsh-liquid-fine)" fill="url(#kabsh-liquid-colour)">
                <Emblem piece={0} />
                <Emblem piece={1} />
                <Emblem piece={2} />
              </g>

              {/* The ram's head: the seal's own drawing, opening out of the middle of its horn. */}
              <g transform={`translate(${HORN[0]} ${HORN[1]})`}>
                <g transform="rotate(-110)">
                  <Moved type="rotate" story={RAM_TURN} />
                  <g transform="scale(0)">
                    <Moved type="scale" story={RAM_SIZE} />
                    <g transform={`translate(${-HORN[0]} ${-HORN[1]})`}>
                      <path d={RAM} fill="url(#kabsh-liquid-colour)" fillRule="evenodd" />
                      <g clipPath="url(#kabsh-ram-shape)">
                        <rect
                          x={-7}
                          y={-16}
                          width={14}
                          height={40}
                          fill="url(#kabsh-ram-light)"
                          transform="translate(-34 0)"
                        >
                          <Moved type="translate" story={RAM_LIGHT} />
                        </rect>
                      </g>
                    </g>
                  </g>
                </g>
              </g>

              {/* The sheep's eye. */}
              <circle cx={-14.6} cy={-3.6} r={1} fill="#ffffff" opacity={0}>
                <Told attribute="opacity" story={shownWhile('sheep', 1)} />
              </circle>

              {/* The light on the drop of water. */}
              <path
                d="M-5.6 4.6Q-6.2 11.2 0 13.2"
                fill="none"
                stroke="#ffffff"
                strokeOpacity="0.85"
                strokeWidth="1.7"
                strokeLinecap="round"
                opacity={0}
              >
                <Told attribute="opacity" story={shownWhile('drop', 1)} />
              </path>

              {/* The Kaaba's gold band and door. */}
              <g opacity={0}>
                <Told attribute="opacity" story={shownWhile('kaaba', 1)} />
                <rect x={-12.5} y={-7} width={25} height={3} fill="#f5c84b" />
                <rect x={-2.6} y={4.5} width={5.2} height={9} rx={0.6} fill="#f5c84b" />
              </g>

              {/* The lines on the Quran's two pages. */}
              <g
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeOpacity="0.9"
                opacity={0}
              >
                <Told attribute="opacity" story={shownWhile('quran', 1)} />
                <path d="M-12.4 -6.6l8 1.3M-12.9 -2.9l8 1.3M-13.4 0.8l8 1.3" />
                <path d="M12.4 -6.6l-8 1.3M12.9 -2.9l-8 1.3M13.4 0.8l-8 1.3" />
              </g>

              {/* The swirl on the sweet. */}
              <path
                d="M-4.4 -4Q1.4 -5.3 3 -0.4Q3.8 4 -0.4 4.4Q-3.4 4.2 -3 1.4Q-2.4 -0.9 0 -0.5"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeOpacity="0.9"
                opacity={0}
              >
                <Told attribute="opacity" story={shownWhile('candy', 1)} />
              </path>

              {/* The mosque's doorway. */}
              <g opacity={0}>
                <Told attribute="opacity" story={shownWhile('mosque', 1)} />
                <path d="M-2.6 15V10.4a2.6 2.6 0 0 1 5.2 0V15Z" fill="#ffffff" />
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
