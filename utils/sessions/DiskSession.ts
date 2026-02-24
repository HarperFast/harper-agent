import { type AgentInputItem, MemorySession } from '@openai/agents';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { PlanState, WithPlanState } from '../../lifecycle/withPlanState';
import type { WithSkillsRead } from '../../lifecycle/withSkillsRead';

interface Storage {
	sessions: Record<string, AgentInputItem[]>;
	skillsRead?: Record<string, string[]>;
	plan?: Record<string, PlanState>;
}

/**
 * A session that persists items to a JSON file on disk.
 * Extends MemorySession to provide in-memory caching and basic session functionality.
 */
export class DiskSession extends MemorySession implements WithSkillsRead, WithPlanState {
	private readonly filePath: string;
	private readonly ready: Promise<void>;

	constructor(filePath: string, options?: ConstructorParameters<typeof MemorySession>[0]) {
		super(options);
		this.filePath = filePath;
		this.ready = this.init(options);
	}

	private async init(options?: ConstructorParameters<typeof MemorySession>[0]): Promise<void> {
		const storage = await this.loadStorage();

		// sessionId is private in MemorySession, but it's set in the constructor.
		// We can access it via the public getSessionId() or by casting to any.
		let sessionId = (this as any).sessionId;

		// If no sessionId was provided, try to use an existing one from the storage
		if (!options?.sessionId) {
			let candidate: string | undefined;
			const sessionIds = Object.keys(storage.sessions ?? {});
			if (sessionIds.length > 0) {
				candidate = sessionIds[0];
			} else {
				const planIds = Object.keys(storage.plan ?? {});
				if (planIds.length > 0) {
					candidate = planIds[0];
				} else {
					const skillsIds = Object.keys(storage.skillsRead ?? {});
					if (skillsIds.length > 0) {
						candidate = skillsIds[0];
					}
				}
			}
			if (candidate) {
				sessionId = candidate;
				(this as any).sessionId = sessionId;
			}
		}

		if (!sessionId) {
			// This shouldn't happen if MemorySession is working correctly, but be safe
			sessionId = (this as any).sessionId || 'default-session';
		}

		// Load existing items from the storage for this session
		const itemsFromStorage = storage.sessions[sessionId];

		if (itemsFromStorage) {
			// We clear whatever was in MemorySession (like initialItems) and replace with content
			// to ensure consistency with the persisted state.
			(this as any).items = itemsFromStorage;
		} else {
			// If the storage doesn't have this session but we have initialItems (already in this.items),
			// we should persist them.
			const items = (this as any).items as AgentInputItem[] || [];
			if (items.length > 0) {
				await this.updateStorage((s) => {
					s.sessions[sessionId] = items;
				});
			}
		}
	}

	private async loadStorage(): Promise<Storage> {
		if (existsSync(this.filePath)) {
			try {
				const data = await readFile(this.filePath, 'utf-8');
				const parsed = JSON.parse(data) as Storage;
				// Ensure required structures exist for backward compatibility
				parsed.sessions = parsed.sessions || {} as any;
				parsed.skillsRead = parsed.skillsRead || {};
				parsed.plan = parsed.plan || {};
				return parsed;
			} catch (e) {
				console.error(`Failed to read session file ${this.filePath}:`, e);
			}
		}
		return { sessions: {}, skillsRead: {}, plan: {} };
	}

	private async updateStorage(update: (storage: Storage) => void): Promise<void> {
		const storage = await this.loadStorage();
		update(storage);

		const dir = dirname(this.filePath);
		if (!existsSync(dir)) {
			await mkdir(dir, { recursive: true });
		}

		const data = JSON.stringify(storage, null, 2);
		const tempPath = `${this.filePath}.tmp`;
		await writeFile(tempPath, data, 'utf-8');
		await rename(tempPath, this.filePath);
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
		// Ensure storage is ready
		await this.ready;

		// Add to in-memory store
		await super.addItems(items);

		// Persist to JSON
		const sessionId = await this.getSessionId();
		await this.updateStorage((storage) => {
			if (!storage.sessions[sessionId]) {
				storage.sessions[sessionId] = [];
			}
			storage.sessions[sessionId].push(...items);
		});
	}

	override async popItem(): Promise<AgentInputItem | undefined> {
		// Ensure storage is ready
		await this.ready;

		// Remove from in-memory store
		const item = await super.popItem();

		if (item) {
			// Remove the last item from JSON for this session
			const sessionId = await this.getSessionId();
			await this.updateStorage((storage) => {
				if (storage.sessions[sessionId]) {
					storage.sessions[sessionId].pop();
				}
			});
		}

		return item;
	}

	override async clearSession(): Promise<void> {
		// Ensure storage is ready
		await this.ready;

		// Clear in-memory store
		await super.clearSession();

		// Clear from JSON
		const sessionId = await this.getSessionId();
		await this.updateStorage((storage) => {
			delete storage.sessions[sessionId];
			if (storage.skillsRead) {
				delete storage.skillsRead[sessionId];
			}
			if (storage.plan) {
				delete storage.plan[sessionId];
			}
		});
	}

	async addSkillRead(skill: string): Promise<void> {
		await this.ready;
		const sessionId = await this.getSessionId();
		await this.updateStorage((storage) => {
			if (!storage.skillsRead) { storage.skillsRead = {}; }
			const arr = storage.skillsRead[sessionId] ?? (storage.skillsRead[sessionId] = []);
			if (!arr.includes(skill)) { arr.push(skill); }
		});
	}

	async getSkillsRead(): Promise<string[]> {
		await this.ready;
		const sessionId = await this.getSessionId();
		const storage = await this.loadStorage();
		return storage.skillsRead?.[sessionId] ?? [];
	}

	async getPlanState(): Promise<PlanState | null> {
		await this.ready;
		const sessionId = await this.getSessionId();
		const storage = await this.loadStorage();
		return storage.plan?.[sessionId] ?? null;
	}

	async setPlanState(state: Partial<PlanState>): Promise<void> {
		await this.ready;
		const sessionId = await this.getSessionId();
		await this.updateStorage((storage) => {
			if (!storage.plan) { storage.plan = {}; }
			const existing = storage.plan[sessionId] ?? { planDescription: '', planItems: [], progress: 0 } as PlanState;
			storage.plan[sessionId] = {
				...existing,
				...state,
				// Ensure arrays/objects are properly merged for planItems
				planItems: Array.isArray(state.planItems) ? state.planItems : existing.planItems,
			} as PlanState;
		});
	}
}
