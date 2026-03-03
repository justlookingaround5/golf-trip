import type { GameEngineInput, GameEngineResult } from '@/lib/types'

export type { GameEngineInput, GameEngineResult } from '@/lib/types'

/** All game engines implement this interface */
export interface GameEngine {
  /** Unique key matching game_formats.engine_key */
  key: string

  /** Compute results from scores */
  compute(input: GameEngineInput): GameEngineResult

  /** Validate that config is correct for this engine */
  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] }

  /** Validate that player count is correct */
  validatePlayers(playerCount: number, config: Record<string, unknown>): { valid: boolean; error?: string }
}
