import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/manrope'
import './styles.css'
import './specialists.css'
import Specialists from './Specialists'
import { specialistProfiles } from './specialist-profiles'
import { specialistHref } from './specialist-links'

const doctor = specialistProfiles.find(item => specialistHref(item.image) === window.location.pathname)
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><Specialists doctor={doctor} /></React.StrictMode>,
)
