export function isVersionNewer(latest: string, current: string) {
	const l = latest.split('.').map((x) => parseInt(x, 10));
	const c = current.split('.').map((x) => parseInt(x, 10));
	for (let i = 0; i < 3; i++) {
		let latestNumber = l[i];
		let currentNumber = c[i];
		if (latestNumber === undefined || currentNumber === undefined || isNaN(latestNumber) || isNaN(currentNumber)) {
			break;
		}
		if (latestNumber > currentNumber) {
			return true;
		}
		if (latestNumber < currentNumber) {
			return false;
		}
	}
	return false;
}
