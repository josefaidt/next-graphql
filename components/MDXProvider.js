import React from 'react'
import { MDXProvider as Provider } from '@mdx-js/react'
import shortcodes from './shortcodes'

export default function MDXProvider({ children }) {
  return <Provider components={shortcodes}>{children}</Provider>
}
