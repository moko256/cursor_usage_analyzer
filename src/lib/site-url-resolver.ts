import { page } from '$app/state';
import { siteHost, siteProtocol } from '../../site-url';

export function currentPageAbsoluteUrl(): URL {
	const url = new URL(page.url);
	url.host = siteHost;
	url.protocol = siteProtocol;

	return url;
}
