import React from 'react'
import styles from './Header.module.css'

export default function Header({ children, ...rest }) {
  return <header className={styles.header}>{children}</header>
}
