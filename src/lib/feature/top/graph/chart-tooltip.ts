import { createAttachmentKey, type Attachment } from 'svelte/attachments';
import type { HTMLAttributes } from 'svelte/elements';

export const TOOLTIP_VIEWPORT_PADDING = 8;
const MIN_USEFUL_HEIGHT = 64;

export type TooltipViewportBox = {
	width: number;
	height: number;
	offsetLeft: number;
	offsetTop: number;
};

export type TooltipPlacement = {
	left: number;
	top: number;
	maxWidth: number;
	maxHeight: number;
};

export function placeTooltipInViewport(
	left: number,
	top: number,
	width: number,
	height: number,
	viewport: TooltipViewportBox,
	padding = TOOLTIP_VIEWPORT_PADDING
): TooltipPlacement {
	const minLeft = viewport.offsetLeft + padding;
	const minTop = viewport.offsetTop + padding;
	const maxRight = viewport.offsetLeft + viewport.width - padding;
	const maxBottom = viewport.offsetTop + viewport.height - padding;
	const viewportMaxWidth = Math.max(0, maxRight - minLeft);
	const viewportMaxHeight = Math.max(0, maxBottom - minTop);

	let nextLeft = left;
	if (left + width > maxRight) {
		const flippedLeft = left - width;
		nextLeft = flippedLeft >= minLeft ? flippedLeft : minLeft;
	} else if (left < minLeft) {
		nextLeft = minLeft;
	}
	nextLeft = Math.min(nextLeft, Math.max(minLeft, maxRight - Math.min(width, viewportMaxWidth)));
	const maxWidth = Math.max(0, Math.min(viewportMaxWidth, maxRight - nextLeft));

	const spaceDown = maxBottom - top;
	const spaceUp = top - minTop;
	let nextTop: number;
	let maxHeight: number;

	if (top + height > maxBottom) {
		if (spaceDown < MIN_USEFUL_HEIGHT && spaceUp > spaceDown) {
			maxHeight = Math.min(Math.max(height, 0), spaceUp, viewportMaxHeight);
			nextTop = top - maxHeight;
		} else {
			maxHeight = Math.max(0, spaceDown);
			nextTop = top;
		}
	} else if (top < minTop) {
		nextTop = minTop;
		maxHeight = viewportMaxHeight;
	} else {
		nextTop = top;
		maxHeight = Math.max(0, maxBottom - nextTop);
	}

	nextTop = Math.min(
		Math.max(nextTop, minTop),
		Math.max(minTop, maxBottom - Math.min(height, maxHeight))
	);

	return { left: nextLeft, top: nextTop, maxWidth, maxHeight };
}

function readViewport(): TooltipViewportBox {
	const viewport = window.visualViewport;
	if (viewport) {
		return {
			width: viewport.width,
			height: viewport.height,
			offsetLeft: viewport.offsetLeft,
			offsetTop: viewport.offsetTop
		};
	}

	return {
		width: window.innerWidth,
		height: window.innerHeight,
		offsetLeft: 0,
		offsetTop: 0
	};
}

function px(value: number) {
	return `${Math.round(value * 10) / 10}px`;
}

function setStyleIfChanged(
	node: HTMLElement,
	property: 'overflow' | 'transform' | 'clipPath',
	value: string
) {
	if (node.style[property] !== value) {
		node.style[property] = value;
	}
}

export const containTooltipInViewport: Attachment<HTMLElement> = (node) => {
	let applying = false;

	const apply = () => {
		if (applying) return;
		applying = true;
		try {
			const viewport = readViewport();
			const left = Number.parseFloat(node.style.left);
			const top = Number.parseFloat(node.style.top);
			if (!Number.isFinite(left) || !Number.isFinite(top)) {
				return;
			}

			const width = node.offsetWidth;
			const height = node.offsetHeight;
			if (width === 0 || height === 0) {
				return;
			}

			const placed = placeTooltipInViewport(left, top, width, height, viewport);
			setStyleIfChanged(
				node,
				'transform',
				`translate(${px(placed.left - left)}, ${px(placed.top - top)})`
			);
			setStyleIfChanged(
				node,
				'clipPath',
				`inset(0 ${px(Math.max(0, width - placed.maxWidth))} ${px(Math.max(0, height - placed.maxHeight))} 0)`
			);
		} finally {
			applying = false;
		}
	};

	const observer = new MutationObserver(apply);
	observer.observe(node, { attributes: true, attributeFilter: ['style'] });
	const resize = new ResizeObserver(() => {
		if (applying) return;
		apply();
	});
	resize.observe(node);
	window.addEventListener('resize', apply);
	window.visualViewport?.addEventListener('resize', apply);
	window.visualViewport?.addEventListener('scroll', apply);
	apply();

	return () => {
		observer.disconnect();
		resize.disconnect();
		window.removeEventListener('resize', apply);
		window.visualViewport?.removeEventListener('resize', apply);
		window.visualViewport?.removeEventListener('scroll', apply);
	};
};

export const chartTooltipRootProps: HTMLAttributes<HTMLElement> = {
	[createAttachmentKey()]: containTooltipInViewport
};
