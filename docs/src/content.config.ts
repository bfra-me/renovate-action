import {docsLoader} from '@astrojs/starlight/loaders'
import {docsSchema} from '@astrojs/starlight/schema'
import {defineCollection} from 'astro:content'

const docs = defineCollection({loader: docsLoader(), schema: docsSchema()})

// Type annotation needed to avoid ts(2742) error with Zod v4 types
// See: https://docs.astro.build/en/guides/upgrade-to/v6/#changed-schema-types-are-inferred-instead-of-generated-content-loader-api
export const collections: Record<string, unknown> = {
  docs,
}
