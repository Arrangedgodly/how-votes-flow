import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import App from './App.tsx'

describe('app shell (T1 scaffold)', () => {
  it('exposes App as a React component', () => {
    expect(typeof App).toBe('function')
  })

  it('keeps the direction contract in index.html, seed key intact', () => {
    const html = readFileSync(
      fileURLToPath(new URL('../index.html', import.meta.url)),
      'utf8',
    )
    for (const block of [
      'THESIS',
      'OWN-WORLD',
      'STORY',
      'FIRST VIEWPORT',
      'FORM',
      'FINISH',
      '71356508',
    ]) {
      expect(html).toContain(block)
    }
    // the contract must be the first child of <body>, ahead of the mount point
    const body = html.slice(html.indexOf('<body'))
    expect(body.indexOf('<!--')).toBeLessThan(body.indexOf('id="root"'))
  })
})
