import { type AgentInputItem, MemorySession } from '@openai/agents';
import sqlite3 from 'sqlite3';

/**
 * A session that persists items to a SQLite database on disk.
 * Extends MemorySession to provide in-memory caching and basic session functionality.
 */
export class DiskSession extends MemorySession {
	private readonly db: sqlite3.Database;
	private readonly ready: Promise<void>;

	constructor(dbPath: string, options?: ConstructorParameters<typeof MemorySession>[0]) {
		super(options);
		this.db = new sqlite3.Database(dbPath);
		this.ready = this.init(options);
	}

	private async init(options?: ConstructorParameters<typeof MemorySession>[0]): Promise<void> {
		// Initialize the database table
		await this.run(`
			CREATE TABLE IF NOT EXISTS session_items (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				sessionId TEXT,
				data TEXT
			)
		`);

		// sessionId is private in MemorySession, but it's set in the constructor.
		// We can access it via the public getSessionId() or by casting to any.
		let sessionId = (this as any).sessionId;

		// If no sessionId was provided, try to use an existing one from the database
		if (!options?.sessionId) {
			const row = await this.get<{ sessionId: string }>('SELECT DISTINCT sessionId FROM session_items LIMIT 1');
			if (row) {
				sessionId = row.sessionId;
				(this as any).sessionId = sessionId;
			}
		}

		// Load existing items from the database for this session
		const rows = await this.all<{ data: string }>(
			'SELECT data FROM session_items WHERE sessionId = ? ORDER BY id ASC',
			sessionId,
		);

		if (rows.length > 0) {
			const itemsFromDb = rows.map((row) => JSON.parse(row.data) as AgentInputItem);
			// We clear whatever was in MemorySession (like initialItems) and replace with DB content
			// to ensure consistency with the persisted state.
			(this as any).items = itemsFromDb;
		} else {
			// If the database is empty but we have initialItems (already in this.items),
			// we should persist them.
			const items = (this as any).items as AgentInputItem[];
			if (items.length > 0) {
				for (const item of items) {
					await this.run('INSERT INTO session_items (sessionId, data) VALUES (?, ?)', sessionId, JSON.stringify(item));
				}
			}
		}
	}

	override async getSessionId(): Promise<string> {
		await this.ready;
		return super.getSessionId();
	}

	override async getItems(limit?: number): Promise<AgentInputItem[]> {
		await this.ready;
		return super.getItems(limit);
	}

	override async addItems(items: AgentInputItem[]): Promise<void> {
		// Ensure DB is ready
		await this.ready;

		// Add to in-memory store
		await super.addItems(items);

		// Persist to SQLite
		const sessionId = await this.getSessionId();
		for (const item of items) {
			await this.run('INSERT INTO session_items (sessionId, data) VALUES (?, ?)', sessionId, JSON.stringify(item));
		}
	}

	override async popItem(): Promise<AgentInputItem | undefined> {
		// Ensure DB is ready
		await this.ready;

		// Remove from in-memory store
		const item = await super.popItem();

		if (item) {
			// Remove the last item from SQLite for this session
			const sessionId = await this.getSessionId();
			await this.run(
				`
				DELETE FROM session_items
				WHERE id = (
					SELECT id FROM session_items
					WHERE sessionId = ?
					ORDER BY id DESC
					LIMIT 1
				)
			`,
				sessionId,
			);
		}

		return item;
	}

	override async clearSession(): Promise<void> {
		// Ensure DB is ready
		await this.ready;

		// Clear in-memory store
		await super.clearSession();

		// Clear from SQLite
		const sessionId = await this.getSessionId();
		await this.run('DELETE FROM session_items WHERE sessionId = ?', sessionId);
	}

	private run(sql: string, ...params: any[]): Promise<void> {
		return new Promise((resolve, reject) => {
			this.db.run(sql, ...params, (err: Error | null) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}

	private get<T>(sql: string, ...params: any[]): Promise<T | undefined> {
		return new Promise((resolve, reject) => {
			this.db.get(sql, ...params, (err: Error | null, row: any) => {
				if (err) {
					reject(err);
				} else {
					resolve(row as T | undefined);
				}
			});
		});
	}

	private all<T>(sql: string, ...params: any[]): Promise<T[]> {
		return new Promise((resolve, reject) => {
			this.db.all(sql, ...params, (err: Error | null, rows: any[]) => {
				if (err) {
					reject(err);
				} else {
					resolve(rows as T[]);
				}
			});
		});
	}
}
