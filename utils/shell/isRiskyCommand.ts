const RISKY_COMMANDS = [
	// File removal
	/(?:^|[;&|])\s*rm\b/i,
	/(?:^|[;&|])\s*shred\b/i,
	/(?:^|[;&|])\s*git\s+clean\b.*\s-f/i,

	// Database operations
	/\bdrop\s+(database|table|collection|schema)\b/i,
	/\btruncate\s+table\b/i,
	/\bdelete\s+from\b/i,

	// Disk/System operations
	/(?:^|[;&|])\s*dd\b.*\bof=/i,
	/(?:^|[;&|])\s*mkfs\b/i,
	/(?:^|[;&|])\s*format\b/i,
	/(?:^|[;&|])\s*fdisk\b/i,
	/(?:^|[;&|])\s*parted\b/i,

	// Permissions (broad changes)
	/(?:^|[;&|])\s*chmod\b.*\s-R/i,
	/(?:^|[;&|])\s*chown\b.*\s-R/i,

	// System state
	/(?:^|[;&|])\s*shutdown\b/i,
	/(?:^|[;&|])\s*reboot\b/i,
	/(?:^|[;&|])\s*halt\b/i,
	/(?:^|[;&|])\s*poweroff\b/i,

	// Networking/Firewall (potentially destructive to access)
	/(?:^|[;&|])\s*iptables\b.*\s(-F|-X|-Z)/i,
	/(?:^|[;&|])\s*ufw\s+reset\b/i,

	// Dangerous redirections
	/>\s*\/dev\/(?!null)/i,
];

/**
 * Checks if a shell command is potentially risky or destructive.
 */
export function isRiskyCommand(command: string): boolean {
	const trimmedCommand = command.trim();
	if (!trimmedCommand) { return false; }

	return RISKY_COMMANDS.some(pattern => pattern.test(trimmedCommand));
}
