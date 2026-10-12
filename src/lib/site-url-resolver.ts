import { building } from '$app/env';
import { page } from '$app/state';
import { siteHost, siteProtocol } from '../../site-url';

export function currentPageAbsoluteUrl(): URL {
	const url = new URL(page.url.href);

	if (building) {
		url.host = siteHost;
		url.protocol = siteProtocol;
	}

	return url;
}
