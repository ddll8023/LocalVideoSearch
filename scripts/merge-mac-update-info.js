const fs = require('node:fs')
const path = require('node:path')

const [outputPath, ...inputPaths] = process.argv.slice(2)

if (!outputPath || inputPaths.length === 0) {
  console.error('Usage: node scripts/merge-mac-update-info.js <output> <input>...')
  process.exit(1)
}

function readMetadata(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const version = content.match(/^version:\s*(.+)$/m)?.[1]
  const releaseDate = content.match(/^releaseDate:\s*(.+)$/m)?.[1]
  const files = []
  const filePattern = /- url:\s*(.+)\n\s+sha512:\s*(.+)\n\s+size:\s*(\d+)/g
  let match

  while ((match = filePattern.exec(content)) !== null) {
    files.push({ url: match[1], sha512: match[2], size: Number(match[3]) })
  }

  if (!version || files.length === 0) {
    throw new Error(`Invalid macOS update metadata: ${filePath}`)
  }

  return { version, releaseDate, files }
}

const metadata = inputPaths.map(readMetadata)
const versions = new Set(metadata.map((item) => item.version))
if (versions.size !== 1) {
  throw new Error(`macOS update metadata versions do not match: ${[...versions].join(', ')}`)
}

const files = metadata.flatMap((item) => item.files)
const duplicateUrls = files.filter((file, index) => files.findIndex((item) => item.url === file.url) !== index)
if (duplicateUrls.length > 0) {
  throw new Error(`Duplicate macOS update files: ${duplicateUrls.map((file) => file.url).join(', ')}`)
}

const zipFiles = files.filter((file) => file.url.toLowerCase().endsWith('.zip'))
const hasArm64Zip = zipFiles.some((file) => /(?:^|[-_])arm64(?:[-_.]|$)/i.test(file.url))
const hasX64Zip = zipFiles.some((file) => !/(?:^|[-_])(?:arm64|aarch64)(?:[-_.]|$)/i.test(file.url))
if (!hasArm64Zip || !hasX64Zip) {
  throw new Error('macOS update metadata must contain both arm64 and x64 ZIP assets')
}

const releaseDate = metadata.map((item) => item.releaseDate).find(Boolean) || ''
const output = [
  `version: ${[...versions][0]}`,
  'files:',
  ...files.flatMap((file) => [
    `  - url: ${file.url}`,
    `    sha512: ${file.sha512}`,
    `    size: ${file.size}`
  ]),
  ...(releaseDate ? [`releaseDate: ${releaseDate}`] : []),
  ''
].join('\n')

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, output, 'utf8')
