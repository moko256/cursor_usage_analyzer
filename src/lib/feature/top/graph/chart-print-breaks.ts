export const PRINT_PAGE_CONTENT_PX = 960;

export type PrintCardBox = {
	top: number;
	height: number;
};

/** Flags cards that would split across a page and should start on the next page. */
export function printBreakBeforeFlags(
	cards: readonly PrintCardBox[],
	pageHeight = PRINT_PAGE_CONTENT_PX
): boolean[] {
	const flags = cards.map(() => false);
	let extra = 0;

	for (let index = 0; index < cards.length; index += 1) {
		const card = cards[index];
		if (card.height >= pageHeight) continue;

		const top = card.top + extra;
		const offsetInPage = ((top % pageHeight) + pageHeight) % pageHeight;
		const spaceLeft = pageHeight - offsetInPage;
		if (card.height > spaceLeft) {
			flags[index] = true;
			extra += spaceLeft;
		}
	}

	return flags;
}

export function applyPrintCardBreaks(root: ParentNode, pageHeight = PRINT_PAGE_CONTENT_PX) {
	const cards = [...root.querySelectorAll<HTMLElement>('.graph-range.is-active .chart-card')];
	clearPrintCardBreaks(root);

	const boxes = cards.map((card) => {
		const rect = card.getBoundingClientRect();
		return { top: rect.top + window.scrollY, height: rect.height };
	});

	const flags = printBreakBeforeFlags(boxes, pageHeight);
	for (let index = 0; index < cards.length; index += 1) {
		cards[index].classList.toggle('print-break-before', flags[index]);
	}
}

export function clearPrintCardBreaks(root: ParentNode) {
	for (const card of root.querySelectorAll('.print-break-before')) {
		card.classList.remove('print-break-before');
	}
}
