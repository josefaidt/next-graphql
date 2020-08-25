import React from 'react'
import MDXProvider from '../components/MDXProvider'
import '../styles/reset.css'

export default function MyApp({ Component, pageProps }) {
  return (
    <MDXProvider>
      <Component {...pageProps} />
    </MDXProvider>
  )
  // return <Component {...pageProps} />
}
