import React from 'react'
import Link from 'next/link'
import { query } from '../../support/data'

export default function BlogPost({ ...post }) {
  console.log('POST', post)
  // ...
  return (
    <section>
      <header>
        <h1>Blog post</h1>
      </header>
      <pre>
        <code>{JSON.stringify(post, null, 2)}</code>
      </pre>
      <div dangerouslySetInnerHTML={{ __html: post.body }} />
    </section>
  )
}

export async function getStaticPaths() {
  const result = await query(`
    {
      posts(directory: "content/posts") {
        slug
        frontmatter {
          status
        }
      }
    }
  `)

  console.log('result', JSON.stringify(result, 2, null))
  const paths = result.data.posts
    .filter(post => {
      return post.frontmatter.status !== 'DRAFT'
    })
    .map(post => {
      return {
        params: {
          slug: post.slug.split('/'),
        },
      }
    })

  console.log(JSON.stringify(paths, null, 2))

  return {
    paths,
    fallback: false,
  }
}

export async function getStaticProps({ params }) {
  const result = await query(
    `
      query GetPostData($slug: String!) {
        post(directory: "content/posts", slug: $slug) {
          frontmatter {
            title
            description
            readingTime {
              text
            }
          }
          body
        }
      }
    `,
    {
      slug: params.slug.join('/'),
    }
  )

  return {
    props: {
      slug: params.slug,
      title: result.data.post.frontmatter.title,
      description: result.data.post.frontmatter.description,
      readingTime: result.data.post.frontmatter.readingTime.text,
      body: result.data.post.body,
    },
  }
}
