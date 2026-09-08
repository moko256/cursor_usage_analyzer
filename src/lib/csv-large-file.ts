/** 1 MiB. Files larger than this need a confirmation before parsing. */
export const LARGE_CSV_THRESHOLD_BYTES = 1024 * 1024;

export function isLargeCsvFile(file: Pick<Blob, 'size'>): boolean {
	return file.size > LARGE_CSV_THRESHOLD_BYTES;
}
