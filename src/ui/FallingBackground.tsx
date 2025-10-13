import { useEffect, useRef } from 'react';

type Point = { x: number; y: number };

// Reuse a subset of game shapes (grid units)
const SHAPES: Point[][] = [
	// I (5)
	[{ x: -2, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
	// O
	[{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
	// T
	[{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
	// Custom: stair-down (matches [] / [][] / [][])
	[{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
	// Custom: zigzag diamond (matches  [][] / [][] /  [] )
	[{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
];

type Piece = {
	shape: Point[];
	x: number; // in pixels
	y: number; // in pixels
	vy: number; // px per ms
	bb: { w: number; h: number }; // bounding box in px
    angle: 0 | 1; // 0 => 0deg, 1 => 90deg
};

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export function FallingBackground() {
	const ref = useRef<HTMLCanvasElement | null>(null);
	const anim = useRef<number | null>(null);
	const pieces = useRef<Piece[]>([]);
	const last = useRef<number>(0);

	useEffect(() => {
		const canvas = ref.current!;
		const ctx = canvas.getContext('2d')!;

		function resize() {
			canvas.width = canvas.clientWidth;
			canvas.height = canvas.clientHeight;
		}
		resize();
		window.addEventListener('resize', resize);

		const cell = 12; // px grid cell
		const color = '#538aff';
		const maxPieces = 12;
		const minGap = 24; // px gap between pieces (avoid touching)

        function bbox(shape: Point[]) {
			const xs = shape.map(p => p.x);
			const ys = shape.map(p => p.y);
			const w = (Math.max(...xs) - Math.min(...xs) + 1) * cell * 2; // each brick ~ 2ch → ~2 cells wide; approximate 2*cell
			const h = (Math.max(...ys) - Math.min(...ys) + 1) * cell;
			return { w, h };
		}

		function spawn() {
			if (pieces.current.length >= maxPieces) return;
            const s = pick(SHAPES);
            const baseBB = bbox(s);
            const angle: 0 | 1 = Math.random() < 0.5 ? 0 : 1;
            const bb = angle === 0 ? baseBB : { w: baseBB.h, h: baseBB.w };
			const margin = 10;
			const xMax = Math.max(margin, canvas.width - bb.w - margin);
			let tries = 0;
			while (tries++ < 10) {
				const x = Math.random() * xMax;
				// ensure no overlap with existing pieces (expanded by minGap)
				const overlaps = pieces.current.some(p => {
					const ax1 = x, ax2 = x + bb.w;
					const ay1 = -bb.h, ay2 = 0; // spawn just above
					const bx1 = p.x - minGap, bx2 = p.x + p.bb.w + minGap;
					const by1 = p.y - minGap, by2 = p.y + p.bb.h + minGap;
					return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1;
				});
                if (!overlaps) {
                    pieces.current.push({ shape: s, x, y: -bb.h, vy: 0.05 + Math.random() * 0.07, bb, angle });
					break;
				}
			}
		}

		function step(t: number) {
			if (!last.current) last.current = t;
			const dt = t - last.current; // ms
			last.current = t;

			// maybe spawn
			if (Math.random() < 0.04) spawn();

			// update
			pieces.current.forEach(p => { p.y += p.vy * dt; });
			// drop pieces that left the screen
			pieces.current = pieces.current.filter(p => p.y < canvas.height + p.bb.h);

			// draw
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle = color;
            pieces.current.forEach(p => {
                for (const pt of p.shape) {
                    let gx = pt.x, gy = pt.y;
                    if (p.angle === 1) {
                        // 90 deg rotation around origin: (x,y) -> (-y,x)
                        const rx = -pt.y; const ry = pt.x; gx = rx; gy = ry;
                    }
                    const px = p.x + (gx + 2) * cell; // rough centering
                    const py = p.y + (gy + 2) * cell;
                    drawBracketGlyph(ctx, px, py, cell, color);
                }
            });
			anim.current = requestAnimationFrame(step);
		}

		anim.current = requestAnimationFrame(step);
		return () => {
			window.removeEventListener('resize', resize);
			if (anim.current) cancelAnimationFrame(anim.current);
		};
	}, []);

	return <canvas ref={ref} className="bb-falling-bg" />;
}

function drawBrick(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
	ctx.save();
	ctx.globalAlpha = 0.25;
	ctx.fillStyle = color;
	ctx.beginPath();
	const r = 3;
	ctx.moveTo(x + r, y);
	ctx.lineTo(x + w - r, y);
	ctx.quadraticCurveTo(x + w, y, x + w, y + r);
	ctx.lineTo(x + w, y + h - r);
	ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
	ctx.lineTo(x + r, y + h);
	ctx.quadraticCurveTo(x, y + h, x, y + h - r);
	ctx.lineTo(x, y + r);
	ctx.quadraticCurveTo(x, y, x + r, y);
	ctx.closePath();
	ctx.fill();
	ctx.restore();
}

function drawAsciiBracket(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
	// Render a simple [] look using two small vertical bars and top/bottom lines
	ctx.save();
	ctx.globalAlpha = 0.28;
	ctx.strokeStyle = color;
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
	ctx.restore();
}

function drawBracketGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number, color: string) {
	// Render a monospaced bracket "[]" block
    const text = '[]';
	ctx.save();
    ctx.globalAlpha = 0.5;
	ctx.fillStyle = color;
	ctx.font = `${cell * 1.2}px VT323, ui-monospace, monospace`;
	ctx.textBaseline = 'top';
	ctx.shadowColor = color;
	ctx.shadowBlur = 8;
    ctx.fillText(text, x, y);
	ctx.restore();
}

export default FallingBackground;


