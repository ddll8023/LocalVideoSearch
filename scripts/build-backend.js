const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const projectRoot = path.resolve(__dirname, '..')
const backendRoot = path.join(projectRoot, 'backend')

for (const directory of ['build', 'dist']) {
  fs.rmSync(path.join(backendRoot, directory), { force: true, recursive: true })
}

const uvCommand = process.env.UV_BIN || 'uv'
const result = spawnSync(
  uvCommand,
  [
    'run',
    '--directory',
    'backend',
    '--group',
    'build',
    'pyinstaller',
    '--clean',
    '--onefile',
    '--name',
    'backend',
    '--distpath',
    'dist',
    'entry.py'
  ],
  {
    cwd: projectRoot,
    stdio: 'inherit'
  }
)

if (result.error) {
  console.error(`无法执行 uv：${result.error.message}`)
  process.exit(1)
}

process.exit(result.status ?? 1)
