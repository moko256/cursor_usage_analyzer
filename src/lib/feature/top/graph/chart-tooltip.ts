import { createAttachmentKey, type Attachment } from 'svelte/attachments';
import type { HTMLAttributes } from 'svelte/elements';

export const TOOLTIP_VIEWPORT_PADDING = 8;

export type TooltipViewportBox = {
	width: number;
	height: number;
	offsetLeft: number;
	offsetTop: number;
};

export function tooltipViewportShift(
	left: number,
	top: number,
	width: number,
	height: number,
	viewport: TooltipViewportBox,
	padding = TOOLTIP_VIEWPORT_PADDING
): { x: number; y: number } {
	const minLeft = viewport.offsetLeft + padding;
	const minTop = viewport.offsetTop + padding;
	const maxLeft = viewport.offsetLeft + viewport.width - width - padding;
	const maxTop = viewport.offsetTop + viewport.height - height - padding;

	return {
		x: Math.min(Math.max(left, minLeft), Math.max(minLeft, maxLeft)) - left,
		y: Math.min(Math.max(top, minTop), Math.max(minTop, maxTop)) - top
	};
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

function setStyleIfChanged(
	node: HTMLElement,
	property: 'maxWidth' | 'maxHeight' | 'overflow' | 'boxSizing' | 'transform',
	value: string
) {
	if (node.style[property] !== value) {
		node.style[property] = value;
	}
}

export const containTooltipInViewport: Attachment<HTMLElement> = (node) => {
	const apply = () => {
		const viewport = readViewport();
		const maxWidth = Math.max(0, viewport.width - TOOLTIP_VIEWPORT_PADDING * 2);
		const maxHeight = Math.max(0, viewport.height - TOOLTIP_VIEWPORT_PADDING * 2);

		setStyleIfChanged(node, 'boxSizing', 'border-box');
		setStyleIfChanged(node, 'overflow', 'hidden');
		setStyleIfChanged(node, 'maxWidth', `${maxWidth}px`);
		setStyleIfChanged(node, 'maxHeight', `${maxHeight}px`);

		const left = Number.parseFloat(node.style.left);
		const top = Number.parseFloat(node.style.top);
		if (!Number.isFinite(left) || !Number.isFinite(top)) {
			return;
		}

		const box = node.getBoundingClientRect();
		if (box.width === 0 || box.height === 0) {
			return;
		}

		const shift = tooltipViewportShift(left, top, box.width, box.height, viewport);
		setStyleIfChanged(node, 'transform', `translate(${shift.x}px, ${shift.y}px)`);
	};

	const observer = new MutationObserver(apply);
	observer.observe(node, { attributes: true, attributeFilter: ['style'] });
	const resize = new ResizeObserver(apply);
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
