import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { basename, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const outputDirectory = join(webRoot, 'public', 'apps')
const manifestPath = join(webRoot, 'src', 'data', 'app-icons.generated.json')

const applicationRoots = [
  join(homedir(), 'Applications'),
  '/Applications',
  '/System/Applications',
]

const listApplications = (directory) => {
  if (!existsSync(directory)) return []

  const applications = []
  const visit = (currentDirectory, depth = 0) => {
    if (depth > 4) return

    let entries
    try {
      entries = readdirSync(currentDirectory, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const path = join(currentDirectory, entry.name)
      if (
        entry.name.endsWith('.app') &&
        (entry.isDirectory() || entry.isSymbolicLink())
      ) {
        applications.push(path)
        continue
      }

      if (!entry.isDirectory()) continue
      visit(path, depth + 1)
    }
  }

  visit(directory)
  return applications
}

const readBundleInfo = (applicationPath) => {
  const macOSPlistPath = join(applicationPath, 'Contents', 'Info.plist')
  const wrappedBundlePath = join(applicationPath, 'WrappedBundle')
  let bundlePath = applicationPath

  if (!existsSync(macOSPlistPath) && existsSync(wrappedBundlePath)) {
    bundlePath = realpathSync(wrappedBundlePath)
  }

  const plistPath = existsSync(join(bundlePath, 'Contents', 'Info.plist'))
    ? join(bundlePath, 'Contents', 'Info.plist')
    : join(bundlePath, 'Info.plist')
  if (!existsSync(plistPath)) return null

  try {
    return {
      bundlePath,
      info: JSON.parse(
        execFileSync('/usr/bin/plutil', [
          '-convert',
          'json',
          '-o',
          '-',
          plistPath,
        ]),
      ),
    }
  } catch {
    const readValue = (key) => {
      try {
        return execFileSync(
          '/usr/libexec/PlistBuddy',
          ['-c', `Print :${key}`, plistPath],
          { stdio: ['ignore', 'pipe', 'ignore'] },
        )
          .toString()
          .trim()
      } catch {
        return
      }
    }

    return {
      bundlePath,
      info: Object.fromEntries(
        [
          'CFBundleDisplayName',
          'CFBundleName',
          'CFBundleExecutable',
          'CFBundleIdentifier',
          'CFBundleIconFile',
        ]
          .map((key) => [key, readValue(key)])
          .filter(([, value]) => value),
      ),
    }
  }
}

const slugify = (value, fallback) => {
  const slug = value
    .normalize('NFKD')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '')

  return slug || fallback
}

const findIconSource = (bundlePath, info) => {
  const macOSResourcesDirectory = join(bundlePath, 'Contents', 'Resources')
  const resourcesDirectory = existsSync(macOSResourcesDirectory)
    ? macOSResourcesDirectory
    : bundlePath
  if (!existsSync(resourcesDirectory)) return null

  const configuredNames = [
    info.CFBundleIconFile,
    ...(info.CFBundleIcons?.CFBundlePrimaryIcon?.CFBundleIconFiles || []),
  ].filter((value) => typeof value === 'string' && value.length > 0)

  const candidates = []
  for (const name of configuredNames) {
    candidates.push(join(resourcesDirectory, name))
    if (!extname(name))
      candidates.push(join(resourcesDirectory, `${name}.icns`))
  }

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }

  const fallbackIcons = readdirSync(resourcesDirectory)
    .filter((name) => /\.(?:icns|png)$/i.test(name))
    .map((name) => join(resourcesDirectory, name))
    .sort((left, right) => statSync(right).size - statSync(left).size)

  return fallbackIcons[0] || null
}

const convertIcon = (sourcePath, applicationPath, outputPath) => {
  if (sourcePath) {
    try {
      execFileSync(
        '/usr/bin/sips',
        [
          '-s',
          'format',
          'png',
          '-z',
          '256',
          '256',
          sourcePath,
          '--out',
          outputPath,
        ],
        { stdio: 'ignore', timeout: 15_000 },
      )
      return true
    } catch {
      // Quick Look is able to render apps whose icon only exists in Assets.car.
    }
  }

  const previewDirectory = mkdtempSync(join(tmpdir(), 'shiro-app-icon-'))
  try {
    const previewPath = join(previewDirectory, 'icon.tiff')
    const script = `
      ObjC.import('AppKit')
      function run(argv) {
        const image = $.NSWorkspace.sharedWorkspace.iconForFile(argv[0])
        image.setSize($.NSMakeSize(256, 256))
        return image.TIFFRepresentation.writeToFileAtomically(argv[1], true)
      }
    `
    execFileSync(
      '/usr/bin/osascript',
      ['-l', 'JavaScript', '-e', script, applicationPath, previewPath],
      { stdio: 'ignore', timeout: 15_000 },
    )

    execFileSync(
      '/usr/bin/sips',
      [
        '-s',
        'format',
        'png',
        '-z',
        '256',
        '256',
        previewPath,
        '--out',
        outputPath,
      ],
      { stdio: 'ignore', timeout: 15_000 },
    )
    return true
  } catch {
    return false
  } finally {
    rmSync(previewDirectory, { force: true, recursive: true })
  }
}

const seenPaths = new Set()
const applications = applicationRoots
  .flatMap(listApplications)
  .filter((path) => {
    const realPath = realpathSync(path)
    if (seenPaths.has(realPath)) return false
    seenPaths.add(realPath)
    return true
  })

const manifest = {}
const aliasScores = new Map()
const generatedIcons = new Map()
const skippedApplications = []

for (const applicationPath of applications) {
  const bundle = readBundleInfo(applicationPath)
  if (!bundle) {
    skippedApplications.push(applicationPath)
    continue
  }
  const { bundlePath, info } = bundle

  const appName = basename(applicationPath, '.app')
  const bundleIdentifier = info.CFBundleIdentifier || appName
  const fallbackSlug = createHash('sha1')
    .update(applicationPath)
    .digest('hex')
    .slice(0, 10)
  const iconName = `installed-${slugify(bundleIdentifier, fallbackSlug)}`
  const outputPath = join(outputDirectory, `${iconName}.png`)

  if (!generatedIcons.has(iconName)) {
    const iconSource = findIconSource(bundlePath, info)
    if (!convertIcon(iconSource, applicationPath, outputPath)) {
      skippedApplications.push(applicationPath)
      continue
    }
    generatedIcons.set(iconName, outputPath)
  }

  const aliases = [
    [appName, 3],
    [`${appName}.app`, 3],
    [info.CFBundleExecutable, 2],
    [info.CFBundleDisplayName, 1],
    [info.CFBundleName, 1],
    [info.CFBundleIdentifier, 3],
  ]

  for (const [alias, score] of aliases) {
    if (typeof alias !== 'string' || !alias.trim()) continue
    const normalizedAlias = alias.trim()
    if ((aliasScores.get(normalizedAlias) || 0) >= score) continue
    manifest[normalizedAlias] = iconName
    aliasScores.set(normalizedAlias, score)
  }
}

const sortedManifest = Object.fromEntries(
  Object.entries(manifest).sort(([left], [right]) =>
    left.localeCompare(right, 'en'),
  ),
)

writeFileSync(manifestPath, `${JSON.stringify(sortedManifest, null, 2)}\n`)

console.info(
  `Generated ${generatedIcons.size} icons and ${Object.keys(sortedManifest).length} aliases from ${applications.length} applications.`,
)
if (skippedApplications.length) {
  console.info(
    `Skipped ${skippedApplications.length} applications without a usable icon:`,
  )
  console.info(skippedApplications.join('\n'))
}
