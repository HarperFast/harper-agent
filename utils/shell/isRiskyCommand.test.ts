import { describe, expect, it } from 'vitest';
import { isRiskyCommand } from './isRiskyCommand';

describe('isRiskyCommand', () => {
	const testCases = [
		{ cmd: 'ls -la', expected: false },
		{ cmd: 'cat README.md', expected: false },
		{ cmd: 'rm file.txt', expected: true },
		{ cmd: 'rm -rf /', expected: true },
		{ cmd: 'DROP DATABASE production', expected: true },
		{ cmd: 'DELETE FROM users', expected: true },
		{ cmd: 'truncate table logs', expected: true },
		{ cmd: 'dd if=/dev/zero of=/dev/sda', expected: true },
		{ cmd: 'mkfs.ext4 /dev/sdb1', expected: true },
		{ cmd: 'format c:', expected: true },
		{ cmd: 'chmod -R 777 /var/www', expected: true },
		{ cmd: 'shutdown -h now', expected: true },
		{ cmd: 'reboot', expected: true },
		{ cmd: 'echo "hello" > /dev/null', expected: false },
		{ cmd: 'echo "hello" > /dev/sda', expected: true },
		{ cmd: 'iptables -F', expected: true },
		{ cmd: 'ufw reset', expected: true },
		{ cmd: 'rm', expected: true },
		{ cmd: 'warmup.sh', expected: false },
		{ cmd: 'ls rm.txt', expected: false },
		{ cmd: 'ls; rm file.txt', expected: true },
	];

	testCases.forEach(({ cmd, expected }) => {
		it(`should return ${expected} for command: "${cmd}"`, () => {
			expect(isRiskyCommand(cmd)).toBe(expected);
		});
	});
});
