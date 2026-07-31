import { useEffect, useState } from 'react'

export function useLocalSet(key) {
  const [value, setValue] = useState(() => {
    try { const stored = JSON.parse(localStorage.getItem(key) || '[]'); return new Set(Array.isArray(stored) ? stored : []) }
    catch { return new Set() }
  })
  useEffect(() => localStorage.setItem(key, JSON.stringify([...value])), [key, value])
  const toggle = id => setValue(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next })
  const add = id => setValue(current => new Set(current).add(id))
  const clear = () => setValue(new Set())
  return { value, toggle, add, clear }
}
