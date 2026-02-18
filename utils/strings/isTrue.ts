export function isTrue(v: string | undefined) {
	if (v === undefined) {
		return false;
	}
	const val = v.trim().toLowerCase();
	return val === 'true' || val === 'y' || val === '1' || val === 'yes' || val === 'on' || val === 'approved'
		|| val === 'approve';
}
