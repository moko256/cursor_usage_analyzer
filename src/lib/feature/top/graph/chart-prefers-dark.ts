import { MediaQuery } from 'svelte/reactivity';

/** One matchMedia listener for every chart that tint series by color scheme. */
export const prefersDarkScheme = new MediaQuery('(prefers-color-scheme: dark)');
