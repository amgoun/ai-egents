'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // #region agent log
  React.useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/b312a5f6-32be-4c70-ab25-adabf357af97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'theme-provider.tsx:11',message:'ThemeProvider mounted',data:{htmlClass:document.documentElement.className,bodyClass:document.body.className,bodyAttrs:Array.from(document.body.attributes).map((a:any) => `${a.name}="${a.value}"`).join(', '),defaultTheme:props.defaultTheme,enableSystem:props.enableSystem},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H3'})}).catch(()=>{});
  }, []);
  // #endregion
  
  // #region agent log
  if (typeof window !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/b312a5f6-32be-4c70-ab25-adabf357af97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'theme-provider.tsx:18',message:'ThemeProvider render',data:{isClient:true,propsAttribute:props.attribute,propsDefaultTheme:props.defaultTheme},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
  }
  // #endregion
  
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
