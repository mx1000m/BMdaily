import { useEffect, useMemo, useRef, useState } from 'react';

type Point = { x: number; y: number };

const COLS = 15;
const ROWS = 25;

const SHAPES: Point[][] = [
	// I (5-long)
	[{ x: -2, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
	// O (square)
	[{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
	// T
	[{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
	// S (corner)
	[{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
	// Z
	[{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
	// short line (3-long)
	[{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }],
	// b (square + one on top-left)
	[{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
	// cross (plus):
	[{ x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
	// pyramid (skewed):
	[{ x: 0, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }],
];

function rotate(points: Point[]): Point[] {
	return points.map((p) => ({ x: -p.y, y: p.x }));
}

function rng(max: number) {
	return Math.floor(Math.random() * max);
}

export function Tetris() {
	const [grid, setGrid] = useState<number[][]>(
		Array.from({ length: ROWS }, () => Array(COLS).fill(0))
	);
	const [active, setActive] = useState<{ shape: Point[]; pos: Point } | null>(null);
	const [tickMs, setTickMs] = useState(700);
	const [baseTickMs, setBaseTickMs] = useState(700);
	const [score, setScore] = useState(0);
	const [lines, setLines] = useState(0);
	const rafRef = useRef<number | null>(null);
	const lastStep = useRef<number>(0);
	const gridRef = useRef<number[][]>(grid);
	const pointerActiveRef = useRef(false);
	const startXRef = useRef(0);
	const startYRef = useRef(0);
	const lastXRef = useRef(0);
	const tapTimeRef = useRef(0);
	const carryDxRef = useRef(0);
	const fastDropRef = useRef(false);

	const leftBorder = useMemo(() => '<|', []);
	const rightBorder = useMemo(() => '|>', []);
	const cell = useMemo(() => '·', []);
	const brick = useMemo(() => '[]', []);

	function spawn() {
		const newShape = SHAPES[rng(SHAPES.length)];
		const spawnPos = { x: Math.floor(COLS / 2), y: 0 };
		// Check if we can spawn (game over if not)
		if (collide(newShape, spawnPos, grid)) {
			// Game over - reset game
			setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
			setScore(0);
			setLines(0);
			setTickMs(700);
		}
		setActive({ shape: newShape, pos: spawnPos });
	}

	function collide(shape: Point[], pos: Point, g: number[][]): boolean {
		for (const p of shape) {
			const x = pos.x + p.x;
			const y = pos.y + p.y;
			// Check boundaries
			if (x < 0 || x >= COLS || y >= ROWS) return true;
			// Check collision with existing pieces (only check if y is within bounds)
			if (y >= 0 && y < ROWS && g[y][x] === 1) return true;
		}
		return false;
	}

	function lockPiece(shape: Point[], pos: Point) {
		setGrid((g) => {
			const ng = g.map((r) => r.slice());
			for (const p of shape) {
				const x = pos.x + p.x;
				const y = pos.y + p.y;
				if (y >= 0 && y < ROWS && x >= 0 && x < COLS) ng[y][x] = 1;
			}
			// clear lines
			let cleared = 0;
			for (let y = ROWS - 1; y >= 0; y--) {
				if (ng[y].every((v) => v === 1)) {
					ng.splice(y, 1);
					ng.unshift(Array(COLS).fill(0));
					cleared++;
					y++;
				}
			}
			if (cleared) {
				setLines((l) => l + cleared);
				setScore((s) => s + cleared * 100);
				setBaseTickMs((t) => {
					const next = Math.max(150, t - cleared * 20);
					// only apply to current tick if not fast dropping
					if (!fastDropRef.current) setTickMs(next);
					return next;
				});
			}
			return ng;
		});
		// if we were in fast drop, restore normal speed after locking
		if (fastDropRef.current) {
			fastDropRef.current = false;
			setTickMs(baseTickMs);
		}
	}

	function step() {
		setActive((a) => {
			if (!a) return a;
			const next = { ...a, pos: { x: a.pos.x, y: a.pos.y + 1 } };
			const g = gridRef.current;
			if (collide(a.shape, next.pos, g)) {
				lockPiece(a.shape, a.pos);
				// spawn next piece immediately
				const newShape = SHAPES[rng(SHAPES.length)];
				const spawnPos = { x: Math.floor(COLS / 2), y: 0 };
				if (collide(newShape, spawnPos, g)) {
					// game over: reset grid and start fresh piece
					setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
					setScore(0);
					setLines(0);
					setTickMs(700);
				}
				return { shape: newShape, pos: spawnPos };
			}
			return next;
		});
	}

	useEffect(() => {
		if (!active) spawn();
		// game loop
		function loop(t: number) {
			if (!lastStep.current) lastStep.current = t;
			if (t - lastStep.current > tickMs) {
				lastStep.current = t;
				step();
			}
			rafRef.current = requestAnimationFrame(loop);
		}
		rafRef.current = requestAnimationFrame(loop);
		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tickMs]);

	useEffect(() => {
		gridRef.current = grid;
	}, [grid]);

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (!active) return;
			if (e.key === 'ArrowLeft') {
				const next = { ...active, pos: { x: active.pos.x - 1, y: active.pos.y } };
				if (!collide(active.shape, next.pos, grid)) setActive(next);
			}
			if (e.key === 'ArrowRight') {
				const next = { ...active, pos: { x: active.pos.x + 1, y: active.pos.y } };
				if (!collide(active.shape, next.pos, grid)) setActive(next);
			}
			if (e.key === 'ArrowUp' || e.key === 'x') {
				const rotated = rotate(active.shape);
				if (!collide(rotated, active.pos, grid)) setActive({ ...active, shape: rotated });
			}
			if (e.key === 'ArrowDown') {
				setTickMs((t) => Math.max(100, t - 100));
			}
		}
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [active, grid]);

	const merged = useMemo(() => {
		const g = grid.map((r) => r.slice());
		if (active) {
			// compute landing position (no render yet)
			let ghostY = active.pos.y;
			while (!collide(active.shape, { x: active.pos.x, y: ghostY + 1 }, grid)) {
				ghostY++;
			}
			// highlight: per-column bars that start just under the piece in that column
			// and extend straight to the bottom of the board
			const xOffsets = Array.from(new Set(active.shape.map((p) => p.x)));
			for (const xOff of xOffsets) {
				const colMaxRelY = Math.max(...active.shape.filter((p) => p.x === xOff).map((p) => p.y));
				const startY = active.pos.y + colMaxRelY + 1;
				const gx = active.pos.x + xOff;
				for (let y = startY; y <= ROWS - 1; y++) {
					if (y >= 0 && y < ROWS && gx >= 0 && gx < COLS && g[y][gx] === 0) {
						g[y][gx] = 4; // highlight
					}
				}
			}
			// render active piece
			for (const p of active.shape) {
				const x = active.pos.x + p.x;
				const y = active.pos.y + p.y;
				if (y >= 0 && y < ROWS && x >= 0 && x < COLS) g[y][x] = 2;
			}
		}
		return g;
	}, [grid, active]);

	function tryMove(dx: number) {
		setActive((a) => {
			if (!a) return a;
			const next = { ...a, pos: { x: a.pos.x + dx, y: a.pos.y } };
			return collide(a.shape, next.pos, gridRef.current) ? a : next;
		});
	}

	function tryRotate() {
		setActive((a) => {
			if (!a) return a;
			const rotated = rotate(a.shape);
			// attempt simple wall kicks: 0, -1, +1
			const kicks = [0, -1, 1];
			for (const k of kicks) {
				const pos = { x: a.pos.x + k, y: a.pos.y };
				if (!collide(rotated, pos, gridRef.current)) return { shape: rotated, pos };
			}
			return a;
		});
	}

	// Touch / pointer controls
	function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
		(e.target as Element).setPointerCapture?.(e.pointerId);
		pointerActiveRef.current = true;
		startXRef.current = e.clientX;
		startYRef.current = e.clientY;
		lastXRef.current = e.clientX;
		carryDxRef.current = 0;
		tapTimeRef.current = performance.now();
		fastDropRef.current = false;
	}

	function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
		if (!pointerActiveRef.current) return;
		const dx = e.clientX - lastXRef.current;
		lastXRef.current = e.clientX;
		carryDxRef.current += dx;
		// Move one column per threshold of ~24px (tweak based on device font size)
		const threshold = 24; // px per grid column
		while (carryDxRef.current <= -threshold) {
			tryMove(-1);
			carryDxRef.current += threshold;
		}
		while (carryDxRef.current >= threshold) {
			tryMove(1);
			carryDxRef.current -= threshold;
		}
		// Detect downward swipe to enable fast drop
		const dy = e.clientY - startYRef.current;
		const dropThreshold = 28; // px vertical swipe to trigger fast drop
		if (!fastDropRef.current && dy > dropThreshold) {
			fastDropRef.current = true;
			setTickMs(60);
		}
	}

	function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
		pointerActiveRef.current = false;
		const totalDx = Math.abs(e.clientX - startXRef.current);
		const totalDy = Math.abs(e.clientY - startYRef.current);
		const dt = performance.now() - tapTimeRef.current;
		// Tap to rotate: small movement and short duration
		if (totalDx < 8 && totalDy < 8 && dt < 250) {
			tryRotate();
		}
		// restore normal speed only if fast drop was enabled
		if (fastDropRef.current) {
			fastDropRef.current = false;
			setTickMs(baseTickMs);
		}
	}

	return (
		<div className="vt100-container">
			<div className="vt100-touchpad" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
				<div className="vt100-topstats">LINES: {lines} 	 SCORE: {score}</div>
				<div className="vt100-board" role="grid">
					{merged.map((row, y) => (
						<div key={y} className="vt100-row">
							<span className="vt100-border">{leftBorder}</span>
						{row.map((v, x) => (
							<span
								key={x}
								className={v === 1 || v === 2 ? 'vt100-brick' : v === 4 ? 'vt100-highlight' : 'vt100-cell'}
							>
								{v === 4 ? cell : v ? brick : cell}
							</span>
						))}
							<span className="vt100-border">{rightBorder}</span>
						</div>
					))}
					<div className="vt100-bottom">
						<span className="vt100-border">{leftBorder}</span>
						<span className="vt100-bottom-line">{'==='.repeat(COLS)}</span>
						<span className="vt100-border">{rightBorder}</span>
					</div>
					<div className="vt100-bottom-vs">{'v'.repeat(COLS + 8)}</div>
				</div>
				<div className="vt100-touchpad-extend" />
			</div>
			{/* mobile: drag to move, tap to rotate */}
		</div>
	);
}




