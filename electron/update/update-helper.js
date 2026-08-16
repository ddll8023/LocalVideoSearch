const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync, spawnSync } = require('node:child_process')

const DEFAULT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000
const PARENT_WAIT_TIMEOUT_MS = 120000
const PARENT_POLL_INTERVAL_MS = 250

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function writeJsonAtomically(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.tmp-${process.pid}`
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  fs.renameSync(temporaryPath, filePath)
}

function readPayload() {
  const payloadText = process.argv[2]
  if (!payloadText) {
    throw new Error('更新安装 helper 缺少参数')
  }

  const payload = JSON.parse(payloadText)
  for (const key of ['archivePath', 'targetAppPath', 'expectedBundleId', 'expectedVersion', 'resultPath']) {
    if (typeof payload[key] !== 'string' || payload[key].length === 0) {
      throw new Error(`更新安装参数缺少 ${key}`)
    }
  }
  if (!path.isAbsolute(payload.archivePath) || !path.isAbsolute(payload.targetAppPath) || !path.isAbsolute(payload.resultPath)) {
    throw new Error('更新安装参数必须使用绝对路径')
  }

  return payload
}

function isProcessRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false
  }

  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error.code === 'EPERM'
  }
}

async function waitForParentExit(parentPid) {
  if (!Number.isInteger(parentPid) || parentPid <= 0) {
    return
  }

  const deadline = Date.now() + PARENT_WAIT_TIMEOUT_MS
  while (isProcessRunning(parentPid)) {
    if (Date.now() >= deadline) {
      throw new Error('等待主应用退出超时')
    }
    await sleep(PARENT_POLL_INTERVAL_MS)
  }
}

function normalizeZipEntry(entry) {
  return entry.replace(/\\/g, '/').replace(/^\.\//, '')
}

function validateZipEntries(archivePath) {
  let output
  try {
    output = execFileSync('/usr/bin/unzip', ['-Z1', archivePath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
  } catch (error) {
    throw new Error(`无法读取更新 ZIP 条目：${error.message}`)
  }

  const entries = output.split(/\r?\n/).filter(Boolean)
  if (entries.length === 0) {
    throw new Error('更新 ZIP 为空')
  }

  for (const entry of entries) {
    const normalized = normalizeZipEntry(entry)
    if (!normalized || normalized.includes('\0') || normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) {
      throw new Error(`更新 ZIP 包含不安全路径：${entry}`)
    }

    const resolved = path.resolve('/private/tmp/update-root', normalized)
    if (resolved !== '/private/tmp/update-root' && !resolved.startsWith('/private/tmp/update-root/')) {
      throw new Error(`更新 ZIP 包含路径逃逸：${entry}`)
    }
  }
}

function isInside(rootPath, candidatePath) {
  const root = path.resolve(rootPath)
  const candidate = path.resolve(candidatePath)
  return candidate === root || candidate.startsWith(`${root}${path.sep}`)
}

function validateExtractedSymlinks(rootPath) {
  const pending = [rootPath]
  while (pending.length > 0) {
    const currentPath = pending.pop()
    const stat = fs.lstatSync(currentPath)
    if (stat.isSymbolicLink()) {
      const target = fs.readlinkSync(currentPath)
      if (path.isAbsolute(target) || !isInside(rootPath, path.resolve(path.dirname(currentPath), target))) {
        throw new Error(`更新应用包含指向目录外部的符号链接：${currentPath}`)
      }
      continue
    }

    if (!stat.isDirectory()) {
      continue
    }

    for (const entry of fs.readdirSync(currentPath)) {
      pending.push(path.join(currentPath, entry))
    }
  }
}

function extractApplication(archivePath, targetAppPath) {
  validateZipEntries(archivePath)

  const targetParent = path.dirname(targetAppPath)
  let workRoot
  try {
    fs.accessSync(targetParent, fs.constants.W_OK)
    workRoot = fs.mkdtempSync(path.join(targetParent, '.videosearch-update-'))
  } catch {
    workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'videosearch-update-'))
  }

  try {
    execFileSync('/usr/bin/ditto', ['-x', '-k', archivePath, workRoot], {
      stdio: ['ignore', 'pipe', 'pipe']
    })
    validateExtractedSymlinks(workRoot)

    const appEntries = fs.readdirSync(workRoot, { withFileTypes: true }).filter((entry) => {
      return entry.isDirectory() && entry.name.endsWith('.app')
    })
    if (appEntries.length !== 1) {
      throw new Error('更新 ZIP 必须包含且只能包含一个 .app')
    }

    return {
      workRoot,
      appPath: path.join(workRoot, appEntries[0].name)
    }
  } catch (error) {
    fs.rmSync(workRoot, { force: true, recursive: true })
    throw new Error(`解压更新应用失败：${error.message}`)
  }
}

function readPlistValue(appPath, key) {
  const infoPlistPath = path.join(appPath, 'Contents', 'Info.plist')
  try {
    return execFileSync('/usr/libexec/PlistBuddy', ['-c', `Print :${key}`, infoPlistPath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim()
  } catch (error) {
    throw new Error(`读取更新应用 ${key} 失败：${error.message}`)
  }
}

function validateApplication(appPath, expectedBundleId, expectedVersion) {
  const bundleId = readPlistValue(appPath, 'CFBundleIdentifier')
  const shortVersion = readPlistValue(appPath, 'CFBundleShortVersionString')
  const bundleVersion = readPlistValue(appPath, 'CFBundleVersion')

  if (bundleId !== expectedBundleId) {
    throw new Error(`更新应用 Bundle ID 不匹配：${bundleId}`)
  }
  if (shortVersion !== expectedVersion && bundleVersion !== expectedVersion) {
    throw new Error(`更新应用版本不匹配：${shortVersion}/${bundleVersion}`)
  }
}

function validateArchitecture(appPath) {
  const executableName = readPlistValue(appPath, 'CFBundleExecutable')
  const executablePath = path.join(appPath, 'Contents', 'MacOS', executableName)
  if (!fs.existsSync(executablePath)) {
    throw new Error(`更新应用缺少主可执行文件：${executablePath}`)
  }

  const output = execFileSync('/usr/bin/file', [executablePath], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
  const isArm64 = process.arch === 'arm64'
  const containsTargetArchitecture = isArm64 ? /arm64/.test(output) : /x86_64/.test(output)
  if (!containsTargetArchitecture) {
    throw new Error(`更新应用架构不匹配：${output.trim()}`)
  }
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`
}

function appleScriptString(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n')}"`
}

function runAsAdministrator(shellCommand) {
  const script = `do shell script ${appleScriptString(shellCommand)} with administrator privileges`
  return execFileSync('/usr/bin/osascript', ['-e', script], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
}

function isPermissionOrCrossDeviceError(error) {
  return ['EACCES', 'EPERM', 'EXDEV'].includes(error?.code)
}

function getBackupPath(targetAppPath) {
  return path.join(
    path.dirname(targetAppPath),
    `.${path.basename(targetAppPath)}.backup-${Date.now()}-${process.pid}`
  )
}

function directReplace(targetAppPath, stagedAppPath, backupPath) {
  fs.renameSync(targetAppPath, backupPath)
  try {
    fs.renameSync(stagedAppPath, targetAppPath)
  } catch (error) {
    try {
      if (fs.existsSync(targetAppPath)) {
        fs.rmSync(targetAppPath, { force: true, recursive: true })
      }
      if (fs.existsSync(backupPath)) {
        fs.renameSync(backupPath, targetAppPath)
      }
    } catch (rollbackError) {
      error.rollbackError = rollbackError.message
    }
    throw error
  }
}

function privilegedReplace(targetAppPath, stagedAppPath, backupPath) {
  const target = shellQuote(targetAppPath)
  const staged = shellQuote(stagedAppPath)
  const backup = shellQuote(backupPath)
  const replaceCommand = [
    'set -e',
    `[ -e ${target} ] && /bin/mv ${target} ${backup}`,
    `/bin/mv ${staged} ${target}`
  ].join('\n')

  try {
    runAsAdministrator(replaceCommand)
  } catch (error) {
    const rollbackCommand = [
      'set +e',
      `[ -e ${target} ] && /bin/rm -rf ${target}`,
      `[ -e ${backup} ] && /bin/mv ${backup} ${target}`
    ].join('\n')
    try {
      runAsAdministrator(rollbackCommand)
    } catch (rollbackError) {
      error.rollbackError = rollbackError.message
    }
    throw error
  }
}

function replaceApplication(targetAppPath, stagedAppPath) {
  const backupPath = getBackupPath(targetAppPath)
  try {
    directReplace(targetAppPath, stagedAppPath, backupPath)
    return backupPath
  } catch (error) {
    if (!isPermissionOrCrossDeviceError(error)) {
      throw error
    }

    if (fs.existsSync(targetAppPath) && !fs.existsSync(stagedAppPath)) {
      throw new Error(`更新替换失败且无法确认回滚状态：${error.message}`)
    }

    privilegedReplace(targetAppPath, stagedAppPath, backupPath)
    return backupPath
  }
}

function cleanupOldBackups(targetAppPath, retentionMs) {
  const targetParent = path.dirname(targetAppPath)
  const backupPrefix = `.${path.basename(targetAppPath)}.backup-`
  const cutoff = Date.now() - retentionMs
  let entries
  try {
    entries = fs.readdirSync(targetParent)
  } catch {
    return
  }

  for (const entry of entries) {
    if (!entry.startsWith(backupPrefix)) {
      continue
    }

    const backupPath = path.join(targetParent, entry)
    try {
      if (fs.statSync(backupPath).mtimeMs >= cutoff) {
        continue
      }
      fs.rmSync(backupPath, { force: true, recursive: true })
    } catch (error) {
      if (!isPermissionOrCrossDeviceError(error)) {
        continue
      }
      try {
        runAsAdministrator(`/bin/rm -rf ${shellQuote(backupPath)}`)
      } catch {
        // 下次安装再尝试清理，不能影响本次更新。
      }
    }
  }
}

function launchApplication(targetAppPath) {
  const result = spawnSync('/usr/bin/open', [targetAppPath], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `open 返回退出码 ${result.status}`)
  }
}

async function runInstallation(payload) {
  const retentionMs = Number(payload.retentionMs) > 0 ? Number(payload.retentionMs) : DEFAULT_RETENTION_MS
  await waitForParentExit(Number(payload.parentPid))
  if (!fs.existsSync(payload.archivePath)) {
    throw new Error(`更新 ZIP 不存在：${payload.archivePath}`)
  }
  if (!fs.existsSync(payload.targetAppPath)) {
    throw new Error(`当前应用不存在：${payload.targetAppPath}`)
  }

  const extracted = extractApplication(payload.archivePath, payload.targetAppPath)
  let backupPath = ''
  let replaced = false
  try {
    validateApplication(extracted.appPath, payload.expectedBundleId, payload.expectedVersion)
    validateArchitecture(extracted.appPath)
    backupPath = replaceApplication(payload.targetAppPath, extracted.appPath)
    replaced = true
    validateApplication(payload.targetAppPath, payload.expectedBundleId, payload.expectedVersion)
    cleanupOldBackups(payload.targetAppPath, retentionMs)

    let warning = ''
    try {
      launchApplication(payload.targetAppPath)
    } catch (error) {
      warning = `应用已替换，但重启失败：${error.message}`
    }

    writeJsonAtomically(payload.resultPath, {
      status: 'success',
      version: payload.expectedVersion,
      backupPath,
      warning,
      completedAt: new Date().toISOString()
    })
  } catch (error) {
    if (replaced) {
      try {
        fs.rmSync(payload.targetAppPath, { force: true, recursive: true })
        if (backupPath && fs.existsSync(backupPath)) {
          fs.renameSync(backupPath, payload.targetAppPath)
        }
      } catch (rollbackError) {
        error.rollbackError = rollbackError.message
      }
    }
    throw error
  } finally {
    fs.rmSync(extracted.workRoot, { force: true, recursive: true })
  }
}

async function main() {
  let payload
  try {
    payload = readPayload()
    await runInstallation(payload)
  } catch (error) {
    const resultPath = payload?.resultPath
    if (resultPath) {
      try {
        writeJsonAtomically(resultPath, {
          status: 'error',
          version: payload.expectedVersion || '',
          error: error.rollbackError ? `${error.message}；回滚失败：${error.rollbackError}` : error.message,
          completedAt: new Date().toISOString()
        })
      } catch {
        // 主应用已退出，只能尽力写结果文件。
      }
    }
    process.exitCode = 1
  }
}

main()
