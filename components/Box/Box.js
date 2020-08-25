import React from 'react'
import styles from './Box.module.css'

export default function Box({ children }) {
  return <div className={styles.box}>{children}</div>
}
