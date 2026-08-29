import { page } from '$app/state';

let siteProtocol: string = 'https';
let siteHost: string = 'moko256.github.io';

export function currentPageAbsoluteUrl(): URL {
	let url = new URL(page.url);
	url.host = siteHost;
	url.protocol = siteProtocol;

	return url;
}
