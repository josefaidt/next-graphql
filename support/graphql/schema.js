// https://github.com/joshblack/www/blob/master/src/graphql/schema.js
import { existsSync as exists, promises as fs } from 'fs'
import path from 'path'
import React from 'react'
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLList,
  GraphQLString,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLEnumType,
} from 'graphql'
import matter from 'gray-matter'
import readingTime from 'reading-time'
import ReactDOM from 'react-dom/server'
import mdx from '@mdx-js/mdx'
import MDXRuntime from '@mdx-js/runtime'
import isUrl from 'is-url'
import visit from 'unist-util-visit'
import remove from 'unist-util-remove'
import yaml from 'yaml'
import detectFrontmatter from 'remark-frontmatter'
import shortcodes from '../../components/shortcodes'

const Post = new GraphQLObjectType({
  name: 'Post',
  fields: () => ({
    filepath: {
      type: new GraphQLNonNull(GraphQLString),
    },
    dirname: {
      type: new GraphQLNonNull(GraphQLString),
    },
    basename: {
      type: new GraphQLNonNull(GraphQLString),
    },
    extension: {
      type: new GraphQLNonNull(GraphQLString),
    },
    data: {
      type: new GraphQLNonNull(GraphQLString),
    },
    slug: {
      type: new GraphQLNonNull(GraphQLString),
    },
    body: {
      type: new GraphQLNonNull(GraphQLString),
    },
    frontmatter: {
      type: new GraphQLObjectType({
        name: 'Frontmatter',
        fields: () => ({
          title: {
            type: new GraphQLNonNull(GraphQLString),
          },
          description: {
            type: new GraphQLNonNull(GraphQLString),
          },
          date: {
            type: new GraphQLNonNull(GraphQLString),
          },
          status: {
            type: new GraphQLEnumType({
              name: 'status',
              values: {
                DRAFT: {
                  value: 'draft',
                },
                PUBLISHED: {
                  value: 'published',
                },
              },
            }),
          },
          readingTime: {
            type: new GraphQLNonNull(
              new GraphQLObjectType({
                name: 'ReadingTime',
                fields: {
                  text: {
                    type: new GraphQLNonNull(GraphQLString),
                  },
                  minutes: {
                    type: new GraphQLNonNull(GraphQLInt),
                  },
                  time: {
                    type: new GraphQLNonNull(GraphQLInt),
                  },
                  words: {
                    type: new GraphQLNonNull(GraphQLInt),
                  },
                },
              })
            ),
          },
        }),
      }),
    },
  }),
})

const PostsQuery = {
  type: new GraphQLList(Post),
  args: {
    directory: {
      type: new GraphQLNonNull(GraphQLString),
      defaultValue: '/',
    },
  },
  async resolve(root, args, ctx) {
    const rootDirectory = path.join(ctx.root, args.directory)
    const files = []
    const queue = [rootDirectory]

    while (queue.length > 0) {
      const filepath = queue.shift()
      const stats = await fs.stat(filepath)

      if (stats.isDirectory()) {
        const children = await fs.readdir(filepath)
        queue.push(...children.map(child => path.join(filepath, child)))
        continue
      }

      const extension = path.extname(filepath)
      if (extension !== '.mdx') {
        continue
      }

      const file = await getFileInfo(rootDirectory, filepath)
      files.push(file)
    }

    return files
  },
}

async function getFileInfo(rootDirectory, filepath) {
  const extension = path.extname(filepath)
  const relativePath = path.relative(rootDirectory, filepath)
  const directory = path.dirname(relativePath)
  const basename = path.basename(filepath, '.mdx')
  const stats = await fs.stat(filepath)
  let slug

  if (directory === '.') {
    slug = basename
  } else {
    slug = path.join(directory, basename)
  }
  // if file basename contains trailing `/index`, remove it for slug
  const indexTest = /\/index$/gi
  if (indexTest.test(slug)) slug = slug.replace(indexTest, '')

  // read and process file
  const data = await fs.readFile(filepath, 'utf8')
  const frontmatter = matter(data)

  function extractFrontmatter() {
    return function transformer(tree, file) {
      visit(tree, 'yaml', function visitor(node) {
        file.data.frontmatter = yaml.parse(node.value)
      })
      remove(tree, 'yaml')
    }
  }
  // console.log('FRONTMATTER', frontmatter)
  // const isImgUrl = str => /\.(svg|png|jpg|jpeg)/.test(str)
  // function myPlugin(tree, file) {
  //   console.log('check out my plugin')
  //   console.log('tree', tree)
  //   visit(tree, 'text', node => {
  //     const text = node.value ? node.value.trim() : ''

  //     if (!isUrl(text) || !isImgUrl(text)) {
  //       return
  //     }

  //     node.type = 'image'
  //     node.url = text

  //     delete node.value
  //   })
  // }
  const jsx = await mdx(data, {
    remarkPlugins: [
      // () => myPlugin,
      detectFrontmatter,
      extractFrontmatter,
      require('@fec/remark-a11y-emoji'),
      require('remark-images'),
      require('remark-autolink-headings'),
      require('@silvenon/remark-smartypants'),
    ],
  })
  // console.log('JSX', jsx)

  // set up consumable Date
  let date
  if (frontmatter.data.date) {
    date = new Date(frontmatter.data.date)
  } else {
    date = new Date(stats.birthtimeMs)
  }

  // result node
  const file = {
    filepath,
    extension,
    basename,
    data,
    slug,
    dirname: path.dirname(filepath),
    frontmatter: {
      ...frontmatter.data,
      description: frontmatter.data.description || frontmatter.content.slice(0, 128).trim(),
      readingTime: readingTime(frontmatter.content),
      date: date.toISOString(),
    },
    body: ReactDOM.renderToStaticMarkup(<MDXRuntime component={shortcodes}>{jsx}</MDXRuntime>),
  }

  return file
}

const PostQuery = {
  name: 'PostQuery',
  type: Post,
  args: {
    directory: {
      type: new GraphQLNonNull(GraphQLString),
      defaultValue: '/',
    },
    slug: {
      type: new GraphQLNonNull(GraphQLString),
    },
  },
  async resolve(root, args, ctx) {
    const rootDirectory = path.join(ctx.root, args.directory)
    let filepath = path.format({
      dir: rootDirectory,
      name: args.slug,
      ext: '.mdx',
    })
    if (!exists(filepath)) {
      filepath = filepath.replace(path.extname(filepath), `/index${path.extname(filepath)}`)
    }
    const file = await getFileInfo(rootDirectory, filepath)
    return file
  },
}

export const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'RootQuery',
    fields: () => ({
      posts: PostsQuery,
      post: PostQuery,
    }),
  }),
})
