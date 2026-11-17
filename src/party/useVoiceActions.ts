import { useEffect, useRef, useState } from 'react'

type Result = { isFinal: boolean; 0: { transcript: string } }
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean
  onstart: (() => void) | null; onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
  onresult: ((event: { resultIndex: number; results: ArrayLike<Result> }) => void) | null
  start(): void; abort(): void
}
type Constructor = new () => Recognition
type Mode = 'next' | 'final' | 'answer' | 'permission'

function constructorForBrowser() {
  const browser = window as Window & { SpeechRecognition?: Constructor; webkitSpeechRecognition?: Constructor }
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition
}

export function voiceCommand(value: string, mode: Mode) {
  const cleaned = value.replace(/[\s，。！？,.!?]/g, '')
  if (mode === 'next' && ['下一关', '继续冒险', '开始下一关', '开启下一关'].includes(cleaned)) return 'next'
  if (mode === 'final' && ['查看结算', '结束挑战'].includes(cleaned)) return 'final'
  if (mode === 'answer' && cleaned === '提交答案') return 'submit'
}

export function listen(mode: Mode, onText: (text: string, final: boolean) => boolean, notice: (text: string) => void, ready?: () => void) {
  const BrowserRecognition = constructorForBrowser()
  if (!BrowserRecognition) {
    notice('此浏览器不支持语音识别，请使用按钮和键盘。')
    return () => {}
  }
  const recognition = new BrowserRecognition()
  let closed = false
  function close() {
    if (closed) return
    closed = true
    recognition.onstart = recognition.onend = recognition.onerror = recognition.onresult = null
    try { recognition.abort() } catch { /* recognition already ended */ }
  }
  recognition.lang = 'zh-CN'
  recognition.interimResults = mode === 'answer'
  recognition.continuous = mode !== 'permission'
  recognition.onstart = () => {
    if (mode === 'permission') {
      close()
      ready?.()
    } else notice('正在聆听…')
  }
  recognition.onerror = event => {
    close()
    const denied = ['not-allowed', 'service-not-allowed'].includes(event.error)
    notice(denied ? '麦克风权限未授权。请使用手动操作，或在浏览器设置中授权。' : '语音识别暂不可用，请手动操作。')
  }
  recognition.onend = () => {
    close()
    notice('语音聆听已结束，可以手动操作。')
  }
  recognition.onresult = event => {
    for (let index = event.resultIndex; index < event.results.length && !closed; index++) {
      const result = event.results[index]
      if (onText(result[0].transcript, result.isFinal)) close()
    }
  }
  try { recognition.start() } catch {
    close()
    notice('无法启动语音识别，请手动操作。')
  }
  return close
}

export function useVoiceActions(mode: 'next' | 'final' | null, action: (command: 'next' | 'final') => void) {
  const [enabled, setEnabled] = useState(false)
  const [notice, setNotice] = useState('')
  const stopProbe = useRef<() => void>(() => {})
  const stopCommand = useRef<() => void>(() => {})
  const actionRef = useRef(action)
  actionRef.current = action
  useEffect(() => () => stopProbe.current(), [])
  function startCommand() {
    stopCommand.current()
    if (!enabled || !mode) return
    setNotice('正在启动麦克风…')
    stopCommand.current = listen(mode, (value, final) => {
      const command = final && voiceCommand(value, mode)
      if (command !== 'next' && command !== 'final') return false
      actionRef.current(command)
      setNotice('')
      return true
    }, setNotice)
  }
  useEffect(() => {
    startCommand()
    return () => stopCommand.current()
  }, [enabled, mode])
  function toggle(active: boolean) {
    stopProbe.current()
    stopCommand.current()
    setNotice('')
    setEnabled(false)
    if (active) {
      stopProbe.current = listen('permission', () => false, setNotice, () => {
        setEnabled(true)
        setNotice('语音操作已开启。')
      })
    }
  }
  return { enabled, notice, toggle, startCommand }
}
