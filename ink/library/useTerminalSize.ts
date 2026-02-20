import { useStdout } from 'ink';
import { useEffect, useState } from 'react';

export function useTerminalSize() {
	const { stdout } = useStdout();
	const [size, setSize] = useState({
		rows: stdout?.rows ?? 24,
		columns: stdout?.columns ?? 80,
	});

	useEffect(() => {
		if (!stdout || !stdout.isTTY) {
			return;
		}

		const handleResize = () => {
			setSize({
				rows: stdout.rows ?? 24,
				columns: stdout.columns ?? 80,
			});
		};

		stdout.on('resize', handleResize);
		return () => {
			stdout.off('resize', handleResize);
		};
	}, [stdout]);

	return size;
}
