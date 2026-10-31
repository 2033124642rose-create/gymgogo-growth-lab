import {useEffect,useState} from 'react'
import {activity,homeVisible,installActivity,optedOut,setOptOut} from './client'
export function useAnalyticsHome(home:boolean){useEffect(()=>{homeVisible(home);return()=>homeVisible(false)},[home])}
export function useAnalyticsActive(active:boolean){useEffect(()=>{if(!active)return;const timer=setInterval(activity,60000);return()=>clearInterval(timer)},[active])}
export function AnalyticsNotice(){const [off,setOff]=useState(optedOut);useEffect(installActivity,[]);return <aside aria-label="匿名统计说明" style={{fontSize:13,padding:'12px 20px',textAlign:'center',color:'#d4dfc6'}}>我们用匿名会话统计首页、入口与开局，不记录姓名、视频、关键点或答案；原始记录计划保留30天。<button type="button" onClick={()=>{setOptOut(!off);setOff(!off)}} style={{marginLeft:10}}>{off?'允许匿名统计':'退出匿名统计'}</button>{off&&<span> 已退出；不影响游戏。已存记录按保留期清理。</span>}</aside>}
