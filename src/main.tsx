import {ExperienceV2,isV2Preview} from './v2/experience'
import './v2/v2.css'
import {AnalyticsNotice} from './analytics/Analytics'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './style.css'
import './playful.css'
import './camera/camera.css'
import './battle.css'
import './round.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ExperienceV2.Provider value={isV2Preview()}><App experienceV2={isV2Preview()}/><AnalyticsNotice/></ExperienceV2.Provider></React.StrictMode>,
)
import './settlement/settlement.css'
