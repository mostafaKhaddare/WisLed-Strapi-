/**
 * PHASE A — Strapi -> JSON export.
 *
 * Runs inside the Strapi project (which owns better-sqlite3) and produces a
 * single, self-contained JSON artifact. The frontend project never gains a
 * SQLite dependency as a result of this migration.
 *
 * Usage:
 *   cd WisLed-Strapi
 *   node export-strapi-content.cjs
 *
 * Output:
 *   migration-out/strapi-export.json
 *
 * Everything is resolved here — nested components, media links and Strapi 5's
 * draft/published row pairs — so Phase B only has to map a flat structure onto
 * Payload documents.
 */

const fs = require('fs')
const path = require('path')

const Database = require('better-sqlite3')

const DB_PATH = path.join(__dirname, '.tmp', 'data.db')
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads')
const OUT_DIR = path.join(__dirname, 'migration-out')
const OUT_FILE = path.join(OUT_DIR, 'strapi-export.json')

const db = new Database(DB_PATH, { readonly: true })

const all = (sql, ...params) => db.prepare(sql).all(...params)
const one = (sql, ...params) => db.prepare(sql).get(...params)

/** Not every entity table has components; Strapi only creates *_cmps when needed. */
const tableExists = (table) =>
  Boolean(
    one(
      `SELECT name FROM sqlite_master WHERE type='table' AND name = ?`,
      table
    )
  )

/** SQLite has no ORDER BY NULLS LAST — order numerically, nulls last, then by id. */
const byOrderThenId = (a, b) => {
  const ao = a.order == null ? Number.MAX_SAFE_INTEGER : a.order
  const bo = b.order == null ? Number.MAX_SAFE_INTEGER : b.order
  return ao === bo ? a.id - b.id : ao - bo
}

/* ─────────────────────────────────────────────
 * Strapi component UID -> physical table name
 * ───────────────────────────────────────────── */
const COMPONENT_TABLE = {
  'about-us.content-section': 'components_about_us_content_sections',
  'about-us.numerical-content': 'components_about_us_numerical_contents',
  'about-us.tile': 'components_about_us_tiles',
  'about-us.why-us': 'components_about_us_whyuses',
  'color-hex.color-hex': 'components_color_hex_color_hexes',
  'color-image.color-image': 'components_color_image_color_images',
  'contact.contact-card': 'components_contact_contact_cards',
  'faq.faq': 'components_faq_faqs',
  'faq.faq-question': 'components_faq_faq_questions',
  'homepage.cta': 'components_homepage_ctas',
  'homepage.hero-banner': 'components_homepage_hero_banners',
  'sections.contact-grid': 'components_sections_contact_grids',
  'sections.h-eader': 'components_sections_h_eaders',
  'sections.hotspot': 'components_sections_hotspots',
}

/**
 * Fields declared `repeatable: true` in the Strapi schemas. Everything else
 * holding components is a single component.
 */
const REPEATABLE_COMPONENT_FIELDS = new Set([
  'Tile',          // about-us.why-us
  'ContactMethods',// sections.contact-grid
  'Question',      // faq.faq
])

/** Top-level entity fields declared repeatable. */
const REPEATABLE_ENTITY_FIELDS = {
  about_uses: ['Numbers'],
  contact_uses: ['Header', 'ContactMethods', 'FormIntro'],
  faqs: ['FAQSection'],
  inspirations: ['hotspots'],
  product_variants_colors: ['Type'],
}

/** Strapi column (snake_case) -> Strapi attribute name (as in schema.json). */
const FIELD_MAP = {
  about_uses: {},
  blogs: { title: 'Title', slug: 'Slug', content: 'Content' },
  blog_post_categories: { title: 'Title', slug: 'Slug' },
  categories: { title: 'title', handle: 'handle', description: 'description' },
  collections: { title: 'Title', handle: 'Handle', description: 'Description' },
  inspirations: { title: 'title', room_type: 'room_type' },
  product_variants_colors: { name: 'Name' },
  privacy_policies: { page_content: 'PageContent' },
  terms_and_conditions: { page_content: 'PageContent' },
}

/**
 * Component rows use the same snake_case storage convention, but the attribute
 * names in schema.json are PascalCase. This maps DB column -> Payload field
 * name for every component. Fields not listed here keep their column name
 * (e.g. product_handle, position_x, room_type).
 */
const COMPONENT_FIELD_MAP = {
  'about-us.content-section': { title: 'Title', text: 'Text' },
  'about-us.numerical-content': { title: 'Title', text: 'Text' },
  'about-us.tile': { title: 'Title', text: 'Text' },
  'about-us.why-us': { title: 'Title' },
  'color-hex.color-hex': { color: 'Color' },
  'color-image.color-image': {},
  'contact.contact-card': { title: 'Title', text: 'Text', link: 'Link' },
  'faq.faq': { title: 'Title', bookmark: 'Bookmark' },
  'faq.faq-question': { title: 'Title', text: 'Text' },
  'homepage.cta': { btn_text: 'BtnText', btn_link: 'BtnLink' },
  'homepage.hero-banner': { headline: 'Headline', text: 'Text' },
  'sections.contact-grid': { title: 'Title' },
  'sections.h-eader': { title: 'Title', text: 'Text' },
  'sections.hotspot': {},
}

/* ─────────────────────────────────────────────
 * Media
 * ───────────────────────────────────────────── */
const mediaById = new Map()

const loadMedia = () => {
  const rows = all(`SELECT * FROM files ORDER BY id`)
  for (const f of rows) {
    const url = f.url || ''
    const filename = url.replace(/^\/uploads\//, '')
    const abs = path.join(UPLOADS_DIR, filename)
    mediaById.set(f.id, {
      strapiId: f.id,
      name: f.name,
      alternativeText: f.alternative_text || null,
      caption: f.caption || null,
      mime: f.mime,
      ext: f.ext,
      size: f.size,
      width: f.width,
      height: f.height,
      url,
      sourceFile: filename,
      existsOnDisk: fs.existsSync(abs),
    })
  }
  return rows.length
}

/** media links for a given related entity/component row */
const linksFor = (relatedType, relatedId) =>
  all(
    `SELECT * FROM files_related_mph
      WHERE related_type = ? AND related_id = ?
      ORDER BY "order", id`,
    relatedType,
    relatedId
  )

/** Resolve a media field to the list of referenced media descriptors. */
const resolveMedia = (relatedType, relatedId, field) =>
  linksFor(relatedType, relatedId)
    .filter((l) => l.field === field)
    .map((l) => mediaById.get(l.file_id))
    .filter(Boolean)

/* ─────────────────────────────────────────────
 * Components (recursive)
 * ───────────────────────────────────────────── */
const componentCache = new Map()

const readComponentRow = (componentType, cmpId) => {
  const table = COMPONENT_TABLE[componentType]
  if (!table) return null
  return one(`SELECT * FROM "${table}" WHERE id = ?`, cmpId)
}

/**
 * Read the child links of a component row, group them by field, and attach.
 */
const attachChildren = (componentType, cmpId, target) => {
  const cmpsTable = `${COMPONENT_TABLE[componentType]}_cmps`
  if (!tableExists(cmpsTable)) return target

  const links = all(
    `SELECT * FROM "${cmpsTable}" WHERE entity_id = ? ORDER BY id`,
    cmpId
  ).sort(byOrderThenId)

  for (const link of links) {
    const isArray = REPEATABLE_COMPONENT_FIELDS.has(link.field)
    const value = resolveComponent(link.component_type, link.cmp_id)
    if (!value) continue

    if (isArray) {
      if (!Array.isArray(target[link.field])) target[link.field] = []
      target[link.field].push(value)
    } else {
      target[link.field] = value
    }
  }
  return target
}

const resolveComponent = (componentType, cmpId) => {
  const key = `${componentType}#${cmpId}`
  if (componentCache.has(key)) return componentCache.get(key)

  const row = readComponentRow(componentType, cmpId)
  if (!row) return null

  const out = {}
  // copy scalar columns (skip the surrogate id), renaming to schema field names
  const fieldMap = COMPONENT_FIELD_MAP[componentType] || {}
  for (const [k, v] of Object.entries(row)) {
    if (k === 'id') continue
    out[fieldMap[k] || k] = v
  }

  // media on this component
  for (const link of linksFor(componentType, cmpId)) {
    const media = mediaById.get(link.file_id)
    if (!media) continue
    const existing = out[link.field]
    if (Array.isArray(existing)) existing.push(media)
    else if (existing) out[link.field] = [existing, media]
    else out[link.field] = media
  }

  attachChildren(componentType, cmpId, out)
  componentCache.set(key, out)
  return out
}

/* ─────────────────────────────────────────────
 * Entities
 * ───────────────────────────────────────────── */

/** Build the payload-shaped object for one entity ROW (draft or published). */
const buildEntity = (table, row) => {
  const out = {
    _strapiId: row.id,
    documentId: row.document_id,
    _status: row.published_at ? 'published' : 'draft',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  }

  const fieldMap = FIELD_MAP[table] || {}
  for (const [col, attr] of Object.entries(fieldMap)) {
    out[attr] = row[col] ?? null
  }

  // direct media on the entity
  const apiUid = {
    about_uses: 'api::about-us.about-us',
    blogs: 'api::blog.blog',
    categories: 'api::category.category',
    collections: 'api::collection.collection',
    inspirations: 'api::inspiration.inspiration',
    contact_uses: 'api::contact-us.contact-us',
    faqs: 'api::faq.faq',
    homepage: 'api::homepage.homepage',
    privacy_policies: 'api::privacy-policy.privacy-policy',
    terms_and_conditions: 'api::terms-and-condition.terms-and-condition',
  }[table]

  if (apiUid) {
    for (const link of linksFor(apiUid, row.id)) {
      const media = mediaById.get(link.file_id)
      if (!media) continue
      out[link.field] = media
    }
  }

  // component links on the entity (only tables that actually have components)
  const repeatable = REPEATABLE_ENTITY_FIELDS[table] || []
  const cmpsTable = `${table}_cmps`
  if (tableExists(cmpsTable)) {
    const ordered = all(
      `SELECT * FROM "${cmpsTable}" WHERE entity_id = ? ORDER BY id`,
      row.id
    ).sort(byOrderThenId)

    for (const link of ordered) {
      const value = resolveComponent(link.component_type, link.cmp_id)
      if (!value) continue
      const isArray = repeatable.includes(link.field)
      if (isArray) {
        if (!Array.isArray(out[link.field])) out[link.field] = []
        out[link.field].push(value)
      } else {
        out[link.field] = value
      }
    }
  }

  return out
}

const exportTable = (table, key) => {
  const rows = all(`SELECT * FROM "${table}" ORDER BY id`)
  return rows.map((r) => buildEntity(table, r))
}

/* ─────────────────────────────────────────────
 * Run
 * ───────────────────────────────────────────── */
const mediaCount = loadMedia()

const exportData = {
  generatedAt: new Date().toISOString(),
  source: { db: DB_PATH, uploads: UPLOADS_DIR },

  media: [...mediaById.values()],

  // collections / globals keyed the same way Payload will store them
  collections: exportTable('collections', 'collections'),
  categories: exportTable('categories', 'categories'),
  blogs: exportTable('blogs', 'blogs'),
  blogPostCategories: exportTable('blog_post_categories', 'blogPostCategories'),
  inspirations: exportTable('inspirations', 'inspirations'),
  productVariantColors: exportTable('product_variants_colors', 'productVariantColors'),

  globals: {
    homepage: exportTable('homepages', 'homepage'),
    aboutUs: exportTable('about_uses', 'aboutUs'),
    contactUs: exportTable('contact_uses', 'contactUs'),
    faq: exportTable('faqs', 'faq'),
    privacyPolicy: exportTable('privacy_policies', 'privacyPolicy'),
    termsAndCondition: exportTable('terms_and_conditions', 'termsAndCondition'),
  },

  relations: {
    // blog -> blog post category, by strapi row id
    blogsCategories: all(`SELECT * FROM blogs_categories_lnk ORDER BY id`),
    blogPostCategories: all(`SELECT id, document_id, title, slug, published_at FROM blog_post_categories ORDER BY id`),
  },

  stats: {},
}

/* orphans: files on disk that the media library does not know about */
const onDisk = fs.existsSync(UPLOADS_DIR) ? fs.readdirSync(UPLOADS_DIR) : []
const known = new Set([...mediaById.values()].map((m) => m.sourceFile))
const orphans = onDisk.filter((f) => f !== '.gitkeep' && !known.has(f))

exportData.stats = {
  mediaInLibrary: mediaCount,
  filesOnDisk: onDisk.length,
  orphanFilesOnDisk: orphans.length,
  orphans,
  mediaMissingOnDisk: [...mediaById.values()].filter((m) => !m.existsOnDisk).map((m) => m.sourceFile),
  counts: {
    collections: exportData.collections.length,
    categories: exportData.categories.length,
    blogs: exportData.blogs.length,
    blogPostCategories: exportData.blogPostCategories.length,
    inspirations: exportData.inspirations.length,
    productVariantColors: exportData.productVariantColors.length,
  },
}

fs.mkdirSync(OUT_DIR, { recursive: true })
fs.writeFileSync(OUT_FILE, JSON.stringify(exportData, null, 2), 'utf8')

console.log(`[export] wrote ${OUT_FILE}`)
console.log(`[export] media in library : ${mediaCount}`)
console.log(`[export] files on disk    : ${onDisk.length}`)
console.log(`[export] orphan files     : ${orphans.length}`)
console.log(`[export] media missing    : ${exportData.stats.mediaMissingOnDisk.length}`)
console.log('[export] content counts   :', JSON.stringify(exportData.stats.counts))
console.log('[export] globals rows     :', Object.entries(exportData.globals).map(([k, v]) => `${k}=${v.length}`).join(' '))

db.close()
