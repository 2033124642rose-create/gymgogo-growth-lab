import {assignment} from '../analytics/experiment'
import {createContext} from 'react'
export const ExperienceV2=createContext(false)
// Stable V2 release; forced links remain QA-only and random experiment is not launched.
export function forcedExperience(){const v=new URLSearchParams(location.search).get('experience');return v==='v1'||v==='v2'?v:null}
export function isV2Preview(){const forced=forcedExperience();return forced?forced==='v2':assignment()?.experience_version!=='v1'}
