import React from 'react'
import Link from 'next/link'
import { query } from '../../support/data'

export default function BlogHomePage({ posts }) {
  console.log('POSTS', posts)
  // ...
  return (
    <section>
      <header>
        <h1>Blog Home</h1>
      </header>
      {posts.map((post, index) => (
        <div key={index}>
          {post.title}
          <Link href={`/posts/${post.slug}`}>Read More</Link>
        </div>
      ))}
    </section>
  )
}

export async function getStaticProps() {
  const result = await query(`
    {
      posts(directory: "content/posts") {
        slug
        frontmatter {
          title
          description
          status
          readingTime {
            text
          }
        }
      }
    }
  `)
  return {
    props: {
      posts: result.data.posts.filter(post => post.frontmatter.status !== 'DRAFT'),
    },
  }
}
