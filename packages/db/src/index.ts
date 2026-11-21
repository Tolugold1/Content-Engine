import { env, isConfigured } from "@content-engine/config";
import { MemoryRepository } from "./memory";
import type { Repository } from "./repository";
import { SupabaseRepository } from "./supabase";

export * from "./repository";
export { MemoryRepository } from "./memory";
export { SupabaseRepository } from "./supabase";
export { createSampleDrafts, SAMPLE_MEDIA } from "./sample-data";
export { toDraft, type DraftRow } from "./mappers";

const holder = globalThis as unknown as { __contentEngineRepository?: Repository };

/**
 * The process-wide repository: Supabase when configured, otherwise an
 * in-memory store seeded with fictional sample drafts (dashboard preview only).
 */
export function getRepository(): Repository {
  if (!holder.__contentEngineRepository) {
    const values = env();
    holder.__contentEngineRepository = isConfigured("database")
      ? new SupabaseRepository(values.SUPABASE_URL!, values.SUPABASE_SERVICE_ROLE_KEY!)
      : new MemoryRepository();
  }
  return holder.__contentEngineRepository;
}

/** For tests: replace the process-wide repository. */
export function setRepository(repository: Repository | undefined): void {
  holder.__contentEngineRepository = repository;
}
