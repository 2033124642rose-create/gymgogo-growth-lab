import GuideArt from './GuideArt'
import {useEffect,useRef,useState} from 'react'
export const GUIDE_KEY='growth.v2.guide.seen'
export function guideSeen(){try{return localStorage.getItem(GUIDE_KEY)==='1'}catch{return false}}
export default function StartGuide({tutorial,onClose,onComplete,onSelect}:{tutorial:boolean;onClose:()=>void;onComplete:()=>void;onSelect:(mode:'solo'|'party')=>void}){
 const [step,setStep]=useState(0)
 const titles=['准备摄像头','学会动作','开始冒险']
 const copy=['开启时请允许摄像头权限。站远一些，让全身和主要关节进入画面。','完整下蹲，再重新站起，才加 1。幅度太小、未达到识别门槛或没有起立不会计数；达到门槛的浅蹲也可识别。','单人完成 10 次深蹲；2–6 人派对轮流闯三关。勾选 AI 知识挑战后，每人每关完成动作目标才会出题。']
 const panel=useRef<HTMLElement>(null)
 useEffect(()=>{const old=document.activeElement as HTMLElement|null;panel.current?.focus();return()=>old?.focus()},[])
 return <div className="modal-overlay v2-overlay" onClick={onClose}><section className="help-modal v2-start" role="dialog" aria-modal="true" aria-labelledby="v2-title" tabIndex={-1} ref={panel} onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const b=Array.from(panel.current!.querySelectorAll<HTMLButtonElement>('button'));if(e.shiftKey&&(document.activeElement===b[0]||document.activeElement===panel.current)){e.preventDefault();b.at(-1)?.focus()}else if(!e.shiftKey&&document.activeElement===b.at(-1)){e.preventDefault();b[0]?.focus()}}}}>
 <span className="product-kicker">你的身体，就是游戏手柄</span><h2 id="v2-title">{tutorial?titles[step]:'今天，怎么出发？'}</h2>
 {tutorial?<><div className="v2-guide-progress" aria-label={`教程第 ${step+1} 页，共 3 页`}><span>{step+1}/3</span><span className="v2-dots" aria-hidden="true">{titles.map((title,i)=><i key={title} className={i===step?'current':''}/>)}</span></div><div key={step} className="v2-guide-slide"><GuideArt step={step}/><p className="v2-guide-copy">{copy[step]}</p>{step===0&&<p className="v2-guide-private">画面仅在浏览器本地用于动作识别，不上传视频或图像。</p>}</div><div className="v2-guide-actions">{step>0&&<button onClick={()=>setStep(step-1)}>上一步</button>}{step<2?<button className="primary-button" onClick={()=>setStep(step+1)}>下一步</button>:<button className="primary-button" onClick={onComplete}>知道了，去冒险</button>}<button className="v2-skip" onClick={onClose}>跳过教程</button></div></>:<><p>共用一个摄像头，轮流上场。选好玩法即可准备。</p><div className="v2-mode-cards"><button onClick={()=>onSelect('solo')}><strong>单人挑战</strong><span>1 人 · 10 次深蹲 · 先轻松试一局</span></button><button onClick={()=>onSelect('party')}><strong>多人派对（2–6人）</strong><span>昵称与帽子 · 三关合作 · 可选 AI 问答</span></button></div><button onClick={onClose}>先逛一逛</button></>}
 </section></div>
}
