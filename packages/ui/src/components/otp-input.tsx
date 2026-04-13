'use client'
import { useRef, useState, useEffect, type KeyboardEvent, type ChangeEvent } from 'react'

import { cn } from '../lib/cn'

export interface OtpInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: boolean
}

export function OtpInput({ length = 6, value, onChange, disabled, error }: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''))

  useEffect(() => {
    const chars = value.split('').slice(0, length)
    const padded = [...chars, ...Array(length - chars.length).fill('')]
    setDigits(padded)
  }, [value, length])

  function handleChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = v
    setDigits(next)
    onChange(next.join(''))
    if (v && index < length - 1) inputsRef.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  return (
    <div className="flex gap-3">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={cn(
            'h-14 w-12 rounded-[10px] border bg-white text-center text-2xl font-semibold transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)]',
            error
              ? 'border-[color:var(--color-error)]'
              : 'border-[color:var(--color-border)] focus-visible:border-[color:var(--color-border-focus)]',
          )}
        />
      ))}
    </div>
  )
}
