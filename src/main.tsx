import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerCategoryColorResolver } from './types'
import { getCategoryColorFromStore } from './store/useCategoryStore'
import App from './App'
import './index.css'

registerCategoryColorResolver(getCategoryColorFromStore)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
