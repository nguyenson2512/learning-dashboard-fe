import { useState, useEffect } from 'react'
import { Dices, Settings, Plus, Trash2 } from 'lucide-react'
import styles from './Dice.module.css'

const STORAGE_DICE = 'dice_config'

export interface DiceReward {
  id: string
  label: string
  values: number[] // e.g. [10, 11, 12] for 2 dice
}

export interface DiceConfig {
  numDice: 1 | 2
  rewards: DiceReward[]
}

const defaultConfig: DiceConfig = {
  numDice: 2,
  rewards: [
    { id: '1', label: '1 song', values: [10, 11, 12] },
    { id: '2', label: '5 min break', values: [7, 8, 9] },
  ],
}

function loadConfig(): DiceConfig {
  try {
    const s = localStorage.getItem(STORAGE_DICE)
    if (s) return JSON.parse(s)
  } catch {}
  return defaultConfig
}

function saveConfig(c: DiceConfig) {
  localStorage.setItem(STORAGE_DICE, JSON.stringify(c))
}

function roll(numDice: 1 | 2): number[] {
  const dice = []
  for (let i = 0; i < numDice; i++) {
    dice.push(1 + Math.floor(Math.random() * 6))
  }
  return dice
}

export default function Dice() {
  const [config, setConfig] = useState<DiceConfig>(loadConfig)
  const [dice, setDice] = useState<number[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [wonReward, setWonReward] = useState<DiceReward | null>(null)

  useEffect(() => {
    saveConfig(config)
  }, [config])

  const handleRoll = () => {
    const result = roll(config.numDice)
    setDice(result)
    const sum = result.reduce((a, b) => a + b, 0)
    const match = config.rewards.find((r) => r.values.includes(sum))
    if (match) setWonReward(match)
  }


  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Roll dice</h1>
        <button
          type="button"
          className={styles.settingsBtn}
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
        >
          <Settings size={22} />
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.diceCount}>
          Number of dice: <strong>{config.numDice}</strong>
        </div>
        <div className={styles.diceDisplay}>
          {dice.length === 0 ? (
            <div className={styles.placeholder}>
              <Dices size={64} />
              <span>Roll to start</span>
            </div>
          ) : (
            <div className={styles.diceResult}>
              {dice.map((d, i) => (
                <span key={i} className={styles.die}>
                  {d}
                </span>
              ))}
              <span className={styles.sum}> = {dice.reduce((a, b) => a + b, 0)}</span>
            </div>
          )}
        </div>
        <button type="button" className={styles.rollBtn} onClick={handleRoll}>
          Roll dice
        </button>
      </div>

      <div className={styles.rewardsPreview}>
        <h3>Rewards configured</h3>
        <ul>
          {config.rewards.map((r) => (
            <li key={r.id}>
              <strong>{r.label}</strong> — when you roll: {r.values.join(', ')}
            </li>
          ))}
        </ul>
      </div>

      {showSettings && (
        <DiceSettingsModal
          config={config}
          onSave={(c) => {
            setConfig(c)
            setShowSettings(false)
            setDice([])
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {wonReward && (
        <div className={styles.modalOverlay} onClick={() => setWonReward(null)}>
          <div className={styles.congratsModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.congratsIcon}>🎉</div>
            <h3>Congratulations!</h3>
            <p className={styles.congratsReward}>You won: <strong>{wonReward.label}</strong></p>
            <button type="button" className={styles.congratsBtn} onClick={() => setWonReward(null)}>
              Awesome!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DiceSettingsModal({
  config,
  onSave,
  onClose,
}: {
  config: DiceConfig
  onSave: (c: DiceConfig) => void
  onClose: () => void
}) {
  const [numDice, setNumDice] = useState<1 | 2>(config.numDice)
  const [rewards, setRewards] = useState<DiceReward[]>(config.rewards)

  const addReward = () => {
    setRewards([
      ...rewards,
      {
        id: crypto.randomUUID(),
        label: '',
        values: numDice === 1 ? [1] : [2],
      },
    ])
  }

  const updateReward = (id: string, upd: Partial<DiceReward>) => {
    setRewards(rewards.map((r) => (r.id === id ? { ...r, ...upd } : r)))
  }

  const setRewardValues = (id: string, str: string) => {
    const nums = str
      .split(/[\s,]+/)
      .map((x) => parseInt(x.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n >= numDice && n <= (numDice === 1 ? 6 : 12))
    const unique = [...new Set(nums)]
    updateReward(id, { values: unique.length ? unique : [numDice] })
  }

  const removeReward = (id: string) => {
    setRewards(rewards.filter((r) => r.id !== id))
  }

  const handleSave = () => {
    onSave({ numDice, rewards: rewards.filter((r) => r.label.trim()) })
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>Dice & rewards settings</h3>
        <div className={styles.form}>
          <label>
            Number of dice
            <select
              value={numDice}
              onChange={(e) => setNumDice(Number(e.target.value) as 1 | 2)}
            >
              <option value={1}>1 die (1–6)</option>
              <option value={2}>2 dice (2–12)</option>
            </select>
          </label>
          <div className={styles.rewardSection}>
            <div className={styles.rewardHeader}>
              <span>Reward</span>
              <button type="button" onClick={addReward}>
                <Plus size={18} /> Add
              </button>
            </div>
            {rewards.map((r) => (
              <div key={r.id} className={styles.rewardRow}>
                <input
                  placeholder="e.g. 1 song"
                  value={r.label}
                  onChange={(e) => updateReward(r.id, { label: e.target.value })}
                />
                <input
                  placeholder="Values (e.g. 10,11,12 for 2 dice)"
                  value={r.values.join(', ')}
                  onChange={(e) => setRewardValues(r.id, e.target.value)}
                />
                <button type="button" className={styles.delBtn} onClick={() => removeReward(r.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.modalActions}>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.primary} onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
