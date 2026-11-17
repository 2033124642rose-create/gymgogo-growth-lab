import { useEffect,useRef,useState } from 'react'
import type { ReactNode } from 'react'
import type { PartySnapshot } from './PartySession'
import { listen, voiceCommand } from './useVoiceActions'
import PartyMonster from './PartyMonster'

export default function PartyQuiz({solo=false,companion,voiceAllowed=false,onDisableVoice,view,notice,busy,onAnswer,onRetryQuestion,onPause,onSkip,onExit,onRetryLevel}: {
  solo?:boolean;voiceAllowed?:boolean;onDisableVoice?:()=>void;companion?:ReactNode;view:PartySnapshot;notice:string;busy:boolean;onAnswer:(answer:string)=>void;onRetryQuestion:()=>void;
  onPause:()=>void;onSkip:()=>void;onExit:()=>void;onRetryLevel:()=>void;
}) {
  const [answer,setAnswer] = useState(view.quiz?.answer || '')
  const heading = useRef<HTMLHeadingElement>(null)
  const panel = useRef<HTMLElement>(null)
  const failed=view.phase==='levelFailed',q=view.quiz
  useEffect(()=>{setAnswer(view.quiz?.answer || '')},[view.currentId,q?.question?.questionId])
  useEffect(()=>{heading.current?.focus({preventScroll:true})},[view.currentId,q?.question?.questionId,failed])
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null
    const keys=(event:KeyboardEvent)=>{
      if(event.key==='Tab'){
        const items=panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),textarea:not(:disabled)')
        if(!items?.length)return
        const first=items[0],last=items[items.length-1]
        if(!panel.current?.contains(document.activeElement)||document.activeElement===heading.current){event.preventDefault();(event.shiftKey?last:first).focus()}
        else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
      }
      // Escape never silently drops a question or marks a task complete. Explicit exit is always available.
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation()}
    }
    window.addEventListener('keydown',keys,true)
    return()=>{window.removeEventListener('keydown',keys,true);previous?.focus()}
  },[])
  const waiting = view.phase==='quizGenerating'||view.phase==='quizJudging'
  const [draft,setDraft] = useState('')
  const [voiceNotice,setVoiceNotice] = useState('')
  const [listenAttempt,setListenAttempt] = useState(0)
  const answerRef = useRef(answer)
  const submitted = useRef(false)
  const stopVoice = useRef<() => void>(() => {})
  const submitRef = useRef<() => boolean>(() => false)
  const canAnswer = !!q?.question && !busy && !waiting && !failed && q.judgments < 3
  answerRef.current = answer
  submitRef.current = () => {
    if (!canAnswer || submitted.current || !answerRef.current.trim()) return false
    submitted.current = true
    stopVoice.current()
    setDraft('')
    onAnswer(answerRef.current.trim())
    return true
  }
  useEffect(() => {
    if (!canAnswer) return
    submitted.current = false
    if (!voiceAllowed) return
    const stop = listen('answer', (text, final) => {
      const command = voiceCommand(text,'answer')
      if (command) {
        setDraft('')
        return final && submitRef.current()
      }
      if (!final) { setDraft(text); return false }
      setDraft('')
      const commandSuffix = /[，。！？,!.?\s]+提交答案[。！？.!?\s]*$/u
      const shouldSubmit = commandSuffix.test(text)
      const appended = text.replace(commandSuffix,'').trim()
      answerRef.current = [answerRef.current, appended].filter(Boolean).join(' ').slice(0,120)
      setAnswer(answerRef.current)
      return shouldSubmit && submitRef.current()
    }, setVoiceNotice)
    stopVoice.current = stop
    return () => { stop(); setDraft('') }
  }, [voiceAllowed, canAnswer, q?.question?.questionId, listenAttempt])
  return <div className={`party-quiz-overlay ${failed?'quiz-invasion':''}`}><section ref={panel} className="party-quiz-panel" role="dialog" aria-modal="true" aria-labelledby="party-quiz-title">
    {failed && <div className="quiz-invader" aria-hidden="true"><PartyMonster level={view.level} hit={false} defeated={false} count={view.total} total={view.players.length*view.level.target}/></div>}
    <div className="quiz-content"><span className="eyebrow">{view.level.name} · {view.players.find(p=>p.id===view.currentId)?.name}</span>
    <h2 ref={heading} tabIndex={-1} id="party-quiz-title">{failed?'挑战失败':view.phase==='quizGenerating'?'怪兽正在出题…':view.phase==='quizJudging'?'AI 正在理解你的答案…':view.phase==='quizUncertain'?'暂时无法确定':'AI 怪兽知识挑战'}</h2>
    <p>动作计数已暂停，可以走近电脑。答题不限时。</p>{companion}
    {failed ? <><p className="quiz-verdict">{q?.result?.explanation}</p><blockquote>{q?.result?.monsterReaction}</blockquote><p>重试将重置本关全员进度，保留此前徽章；新一轮AI调用仍受额度限制。</p><div className="quiz-actions"><button className="primary-button" disabled={busy} onClick={onRetryLevel}>重新挑战本关</button><button disabled={busy} onClick={onExit}>{solo?'返回单人设置':'返回派对'}</button></div></> : <>
      {q?.question && <><span className="quiz-ai-label">百炼 AI 动态出题 · 本回合固定一题</span><h3>{q.question.question}</h3><form onSubmit={event=>{event.preventDefault();submitRef.current()}}><label htmlFor="quiz-answer">你的简短答案</label><textarea id="quiz-answer" value={(answer+draft).slice(0,120)} maxLength={120} disabled={waiting||busy} onChange={event=>{setDraft('');setAnswer(event.target.value)}} placeholder="用自己的话回答即可"/><small>{Array.from(answer).length} / 120 字</small><button className="primary-button" disabled={waiting||busy||!answer.trim()||(q.judgments>=3)}>{q.judgments?'再次判题':'提交答案'}</button></form>{voiceAllowed&&canAnswer&&<div className="voice-operation"><small role="status">{voiceNotice} 可以说「提交答案」。确认提交后，仅发送答案文字。</small><button type="button" onClick={()=>setListenAttempt(n=>n+1)}>重新聆听</button><button type="button" onClick={onDisableVoice}>关闭语音操作</button></div>}</>}
      {q?.result?.verdict==='uncertain' && <p className="quiz-verdict">{q.result.explanation} 可以补充答案后主动重新判题。</p>}
      {view.phase==='quizUnavailable' && <p role="status">AI暂不可用，未判失败，也未解锁下一关。</p>}
      {notice && <p className="quiz-notice" role="status">{notice}</p>}
      {!q?.question && view.phase==='quizUnavailable' && <button disabled={busy||!!q?.pending||(q?.generations??0)>=3} onClick={onRetryQuestion}>重试出题（可能消耗额度）</button>}
      {(q?.judgments??0)>=3 && <p className="quiz-notice">本题判题尝试已用完，请安全退出；不会自动判负。</p>}
      <div className="quiz-actions"><button disabled={busy&&failed} onClick={onPause}>休息</button>{!solo&&!waiting&&<button disabled={busy} onClick={onSkip}>延后答题</button>}<button onClick={onExit}>安全退出问答</button></div>
      <small>出题尝试 {q?.generations??0}/3 · 判题尝试 {q?.judgments??0}/3。异常不会判负；不自动重试。</small>
    </>}
    {failed&&notice&&<p role="status">{notice}</p>}
    </div></section></div>
}
