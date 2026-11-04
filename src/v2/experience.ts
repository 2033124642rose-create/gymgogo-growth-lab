import {assignment} from '../analytics/experiment'
import {createContext} from 'react'
export const ExperienceV2=createContext(false)
export function isV2Preview(){return assignment()?.experience_version==='v2' || import.meta.env.DEV && new URLSearchParams(location.search).get('experience')==='v2'}
