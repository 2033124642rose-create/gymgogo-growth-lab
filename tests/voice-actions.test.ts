// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { listen, voiceCommand } from '../src/party/useVoiceActions'
afterEach(() => vi.unstubAllGlobals())

it('accepts only role-specific speech commands', () => {
  for (const value of ['下一关', '继续冒险。', '开始下一关', '开启下一关']) expect(voiceCommand(value, 'next')).toBe('next')
  expect(voiceCommand('结束挑战', 'final')).toBe('final')
  expect(voiceCommand('提交答案', 'answer')).toBe('submit')
  expect(voiceCommand('我不知道下一关', 'next')).toBeUndefined()
})

it('stops recognition after a command, ignoring further results in the same event', () => {
  const recognizer = { continuous: false, start: vi.fn(), abort: vi.fn(), onresult: null as null | ((event: unknown) => void) }
  vi.stubGlobal('SpeechRecognition', function () { return recognizer })
  const callback = vi.fn(() => true)
  const stop = listen('next', callback, vi.fn())
  expect(recognizer.continuous).toBe(true)
  const final = { isFinal: true, 0: { transcript: '下一关' } }
  recognizer.onresult?.({ resultIndex: 0, results: [final, final] })
  stop()
  expect(callback).toHaveBeenCalledTimes(1)
  expect(recognizer.abort).toHaveBeenCalledTimes(1)
})
