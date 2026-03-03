import type { GameEngine } from './types'
import { skinsEngine } from './skins'
import { nassauEngine } from './nassau'
import { strokePlayEngine } from './stroke-play'
import { bestBallEngine } from './best-ball'
import { matchPlayEngine } from './match-play-v2'
import { stablefordEngine } from './stableford'
import { ninePointEngine } from './nine-point'
import { vegasEngine } from './vegas'
import { scrambleEngine } from './scramble'
import { wolfEngine } from './wolf'
import { bankerEngine } from './banker'
import { hammerEngine } from './hammer'
import { dotsEngine } from './dots'
import { snakeEngine } from './snake'
import { rabbitEngine } from './rabbit'

/** Registry of all available game engines */
const engines: Record<string, GameEngine> = {}

function register(engine: GameEngine) {
  engines[engine.key] = engine
}

// Register all engines
register(skinsEngine)
register(nassauEngine)
register(strokePlayEngine)
register(bestBallEngine)
register(matchPlayEngine)
register(stablefordEngine)
register(ninePointEngine)
register(vegasEngine)
register(scrambleEngine)
register(wolfEngine)
register(bankerEngine)
register(hammerEngine)
register(dotsEngine)
register(snakeEngine)
register(rabbitEngine)

/** Get an engine by its key. Returns undefined if not found. */
export function getEngine(key: string): GameEngine | undefined {
  return engines[key]
}

/** Get all registered engine keys */
export function getEngineKeys(): string[] {
  return Object.keys(engines)
}

export { type GameEngine } from './types'
