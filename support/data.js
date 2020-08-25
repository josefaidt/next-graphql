import { graphql } from 'graphql'
import { schema } from './graphql/schema'

const context = {
  root: process.cwd(),
}

export function query(requestString, variableValues) {
  return graphql(schema, requestString, null, context, variableValues)
}
