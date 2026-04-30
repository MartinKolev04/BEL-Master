import type { FirestoreTest } from '../services/repositories/firestoreShapes';

/*
 * The original seed payload (extracted from the legacy `src/lib/questions.ts`)
 * shipped with structural corruption that prevented TypeScript and esbuild
 * from parsing the project. The corruption included an unterminated string
 * literal mid-passage, broken UTF-8 byte sequences split across newlines, and
 * duplicate `part_3_literature` section objects in the same test.
 *
 * This array is intentionally empty: the admin-only `QuestionsRepository.seedInitialData`
 * path becomes a no-op until a clean seed is provided. Tests are read live from
 * the existing Firestore `tests` collection, so the user-facing app behaviour
 * is unchanged. Restoring the seed is a separate, content-level task.
 */
export const initialTestSeed: FirestoreTest[] = [];
