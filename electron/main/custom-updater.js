const crypto = require('node:crypto')
const fs = require('node:fs')
const https = require('node:https')
const path = require('node:path')

const UPDATE_DIR_NAME = 'updates'
const RESULT_FILE_NAME = 'update-result.json'
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000
const MAX_METADATA_SIZE = 1024 * 1024
const MAX_REDIRECTS = 5

function unquote(value) {
  const text = String(value || '').trim()
  if (text.length >= 2 && ((text.startsWith("'") && text.endsWith("'")) || (text.startsWith('"') && text.endsWith('"')))) {
    return text.slice(1, -1)
  }
  return text
}

function parseMacUpdateInfo(content) {
  const metadata = {
    version: '',
    releaseDate: '',
    files: []
  }
  let currentFile = null

  for (const line of String(content).split(/\r?\n/)) {
    const versionMatch = line.match(/^version:\s*(.+)$/)
    if (versionMatch) {
      metadata.version = unquote(versionMatch[1])
      continue
    }

    const releaseDateMatch = line.match(/^releaseDate:\s*(.+)$/)
    if (releaseDateMatch) {
      metadata.releaseDate = unquote(releaseDateMatch[1])
      continue
    }

    const urlMatch = line.match(/^\s*-\s+url:\s*(.+)$/)
    if (urlMatch) {
      if (currentFile) {
        metadata.files.push(currentFile)
      }
      currentFile = {
        url: unquote(urlMatch[1]),
        sha512: '',
        size: null
      }
      continue
    }

    if (!currentFile) {
      continue
    }

    const sha512Match = line.match(/^\s+sha512:\s*(.+)$/)
    if (sha512Match) {
      currentFile.sha512 = unquote(sha512Match[1])
      continue
    }

    const sizeMatch = line.match(/^\s+size:\s*(\d+)$/)
    if (sizeMatch) {
      currentFile.size = Number(sizeMatch[1])
    }
  }

  if (currentFile) {
    metadata.files.push(currentFile)
  }

  if (!metadata.version || metadata.files.length === 0) {
    throw new Error('latest-mac.yml 缺少有效版本或文件列表')
  }

  return metadata
}

function parseVersion(value) {
  const normalized = String(value || '').trim().replace(/^v/i, '')
  const match = normalized.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/)
  if (!match) {
    throw new Error(`无效的版本号：${value}`)
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split('.') : []
  }
}

function compareVersions(left, right) {
  const a = parseVersion(left)
  const b = parseVersion(right)

  for (const key of ['major', 'minor', 'patch']) {
    if (a[key] !== b[key]) {
      return a[key] > b[key] ? 1 : -1
    }
  }

  if (a.prerelease.length === 0 && b.prerelease.length === 0) {
    return 0
  }
  if (a.prerelease.length === 0) {
    return 1
  }
  if (b.prerelease.length === 0) {
    return -1
  }

  const length = Math.max(a.prerelease.length, b.prerelease.length)
  for (let index = 0; index < length; index += 1) {
    if (index >= a.prerelease.length) {
      return -1
    }
    if (index >= b.prerelease.length) {
      return 1
    }

    const leftPart = a.prerelease[index]
    const rightPart = b.prerelease[index]
    if (leftPart === rightPart) {
      continue
    }

    const leftNumeric = /^\d+$/.test(leftPart)
    const rightNumeric = /^\d+$/.test(rightPart)
    if (leftNumeric && rightNumeric) {
      return Number(leftPart) > Number(rightPart) ? 1 : -1
    }
    if (leftNumeric !== rightNumeric) {
      return leftNumeric ? -1 : 1
    }
    return leftPart > rightPart ? 1 : -1
  }

  return 0
}

function requestText(url, headers = {}, redirectCount = 0) {
  if (redirectCount > MAX_REDIRECTS) {
    return Promise.reject(new Error('更新服务器重定向次数过多'))
  }

  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          'User-Agent': 'VideoSearch-Desktop-Updater',
          ...headers
        }
      },
      (response) => {
        const statusCode = response.statusCode || 0
        if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
          response.resume()
          const redirectUrl = new URL(response.headers.location, url).toString()
          requestText(redirectUrl, headers, redirectCount + 1).then(resolve, reject)
          return
        }

        if (statusCode < 200 || statusCode >= 300) {
          response.resume()
          reject(new Error(`更新服务器返回 HTTP ${statusCode}`))
          return
        }

        const chunks = []
        let totalSize = 0
        let settled = false
        response.on('data', (chunk) => {
          if (settled) {
            return
          }
          totalSize += chunk.length
          if (totalSize > MAX_METADATA_SIZE) {
            settled = true
            response.destroy()
            reject(new Error('更新元数据超过大小限制'))
            return
          }
          chunks.push(chunk)
        })
        response.on('error', (error) => {
          if (!settled) {
            settled = true
            reject(error)
          }
        })
        response.on('end', () => {
          if (settled) {
            return
          }
          settled = true
          resolve(Buffer.concat(chunks).toString('utf8'))
        })
      }
    )

    request.on('error', reject)
    request.setTimeout(15000, () => {
      request.destroy(new Error('更新服务器请求超时'))
    })
  })
}

function downloadFile(url, destinationPath, onProgress, redirectCount = 0) {
  if (redirectCount > MAX_REDIRECTS) {
    return Promise.reject(new Error('更新下载重定向次数过多'))
  }

  return new Promise((resolve, reject) => {
    let output = null
    let response = null
    let settled = false

    const fail = (error) => {
      if (settled) {
        return
      }
      settled = true
      response?.destroy()
      output?.destroy()
      reject(error)
    }

    const request = https.get(
      url,
      {
        headers: {
          Accept: 'application/octet-stream',
          'User-Agent': 'VideoSearch-Desktop-Updater'
        }
      },
      (nextResponse) => {
        response = nextResponse
        const statusCode = response.statusCode || 0
        if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
          response.resume()
          const redirectUrl = new URL(response.headers.location, url).toString()
          downloadFile(redirectUrl, destinationPath, onProgress, redirectCount + 1).then(resolve, reject)
          return
        }

        if (statusCode < 200 || statusCode >= 300) {
          response.resume()
          fail(new Error(`更新下载返回 HTTP ${statusCode}`))
          return
        }

        const contentLength = Number(response.headers['content-length']) || 0
        const hash = crypto.createHash('sha512')
        let downloadedSize = 0
        output = fs.createWriteStream(destinationPath, { flags: 'w' })

        output.on('error', fail)
        output.on('finish', () => {
          if (settled) {
            return
          }
          settled = true
          resolve({
            size: downloadedSize,
            sha512: hash.digest('base64')
          })
        })
        response.on('error', fail)
        response.on('data', (chunk) => {
          downloadedSize += chunk.length
          hash.update(chunk)
          onProgress(downloadedSize, contentLength)
        })
        response.pipe(output)
      }
    )

    request.on('error', fail)
    request.setTimeout(30000, () => {
      request.destroy(new Error('更新下载请求超时'))
    })
  })
}

function getAssetFileName(url) {
  try {
    const parsedUrl = new URL(url, 'https://github.com')
    return path.basename(decodeURIComponent(parsedUrl.pathname))
  } catch {
    return path.basename(url)
  }
}

function getPackageConfig(app) {
  const packagePath = path.join(app.getAppPath(), 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  const publishConfig = Array.isArray(packageJson.build?.publish)
    ? packageJson.build.publish[0]
    : packageJson.build?.publish

  if (!publishConfig || publishConfig.provider !== 'github' || !publishConfig.owner || !publishConfig.repo) {
    throw new Error('打包配置缺少 GitHub 更新源')
  }

  if (!packageJson.build.appId) {
    throw new Error('打包配置缺少应用 Bundle ID')
  }

  return {
    owner: publishConfig.owner,
    repo: publishConfig.repo,
    appId: packageJson.build.appId
  }
}

function getUpdateDirectory(userDataPath) {
  const updateDirectory = path.join(userDataPath, UPDATE_DIR_NAME)
  fs.mkdirSync(updateDirectory, { recursive: true })
  return updateDirectory
}

function removeStaleEntries(directoryPath, retentionMs = RETENTION_MS) {
  if (!fs.existsSync(directoryPath)) {
    return
  }

  const cutoff = Date.now() - retentionMs
  for (const entry of fs.readdirSync(directoryPath)) {
    const entryPath = path.join(directoryPath, entry)
    try {
      const stat = fs.statSync(entryPath)
      if (stat.mtimeMs < cutoff) {
        fs.rmSync(entryPath, { force: true, recursive: true })
      }
    } catch (error) {
      console.warn(`[updater] 清理旧更新文件失败：${entryPath}`, error)
    }
  }
}

function findMacZipFile(metadata, architecture) {
  const zipFiles = metadata.files.filter((file) => getAssetFileName(file.url).toLowerCase().endsWith('.zip'))
  const architectureFiles = zipFiles.filter((file) => {
    const fileName = getAssetFileName(file.url).toLowerCase()
    const isArm64 = fileName.includes('arm64') || fileName.includes('aarch64')
    return architecture === 'arm64' ? isArm64 : !isArm64
  })

  if (architectureFiles.length !== 1) {
    throw new Error(`latest-mac.yml 未找到唯一的 macOS ${architecture} ZIP 资产`)
  }

  return architectureFiles[0]
}

function findReleaseAsset(release, fileName) {
  const asset = (release.assets || []).find((item) => item.name === fileName)
  if (!asset || !asset.browser_download_url) {
    throw new Error(`GitHub Release 缺少更新资产：${fileName}`)
  }
  return asset
}

class MacUpdateManager {
  constructor({ app, projectRoot, publishState, getState }) {
    this.app = app
    this.projectRoot = projectRoot
    this.publishState = publishState
    this.getState = getState
    this.manifest = null
    this.downloadPromise = null
    this.packageConfig = null
  }

  getUserDataPath() {
    return this.app.getPath('userData')
  }

  getResultPath() {
    return path.join(this.getUserDataPath(), RESULT_FILE_NAME)
  }

  getHelperPath() {
    return this.app.isPackaged
      ? path.join(process.resourcesPath, 'update-helper', 'update-helper.js')
      : path.join(this.projectRoot, 'electron', 'update', 'update-helper.js')
  }

  getPackageConfig() {
    if (!this.packageConfig) {
      this.packageConfig = getPackageConfig(this.app)
    }
    return this.packageConfig
  }

  getCurrentAppBundlePath() {
    return path.dirname(path.dirname(path.dirname(process.execPath)))
  }

  async check() {
    this.publishState({ status: 'checking', percent: 0, error: '' })
    this.manifest = null

    const { owner, repo } = this.getPackageConfig()
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`
    const release = JSON.parse(await requestText(apiUrl, { Accept: 'application/vnd.github+json' }))
    if (release.draft || release.prerelease) {
      throw new Error('GitHub 最新 Release 不是正式版本')
    }

    const metadataAsset = findReleaseAsset(release, 'latest-mac.yml')
    const metadataText = await requestText(metadataAsset.browser_download_url)
    const metadata = parseMacUpdateInfo(metadataText)
    const releaseVersion = release.tag_name || metadata.version
    parseVersion(releaseVersion)
    parseVersion(metadata.version)
    if (compareVersions(releaseVersion, metadata.version) !== 0) {
      throw new Error('GitHub Release 版本与 latest-mac.yml 不一致')
    }

    const currentVersion = this.app.getVersion()
    if (compareVersions(metadata.version, currentVersion) <= 0) {
      this.publishState({
        status: 'not-available',
        version: '',
        releaseName: '',
        releaseDate: '',
        percent: 0,
        error: ''
      })
      return this.getState()
    }

    if (!['arm64', 'x64'].includes(process.arch)) {
      throw new Error(`当前 macOS 架构不受支持：${process.arch}`)
    }

    const selectedFile = findMacZipFile(metadata, process.arch)
    const fileName = getAssetFileName(selectedFile.url)
    const asset = findReleaseAsset(release, fileName)
    const metadataSize = Number(selectedFile.size) || 0
    const assetSize = Number(asset.size) || 0
    if (metadataSize && assetSize && metadataSize !== assetSize) {
      throw new Error(`更新资产大小与 latest-mac.yml 不一致：${fileName}`)
    }

    this.manifest = {
      version: metadata.version,
      releaseName: release.name || release.tag_name || `v${metadata.version}`,
      releaseDate: metadata.releaseDate || release.published_at || '',
      fileName,
      size: metadataSize || assetSize,
      sha512: selectedFile.sha512 || '',
      url: asset.browser_download_url
    }

    this.publishState({
      status: 'available',
      version: this.manifest.version,
      releaseName: this.manifest.releaseName,
      releaseDate: this.manifest.releaseDate,
      percent: 0,
      error: ''
    })
    return this.getState()
  }

  async download() {
    if (!this.manifest) {
      return this.getState()
    }
    if (this.downloadPromise) {
      return this.downloadPromise
    }

    this.downloadPromise = this.performDownload()
    try {
      return await this.downloadPromise
    } finally {
      this.downloadPromise = null
    }
  }

  async performDownload() {
    const updateDirectory = getUpdateDirectory(this.getUserDataPath())
    removeStaleEntries(updateDirectory)
    const destinationPath = path.join(updateDirectory, this.manifest.fileName)
    const temporaryPath = `${destinationPath}.part`
    fs.rmSync(temporaryPath, { force: true })
    fs.rmSync(destinationPath, { force: true })

    this.publishState({ status: 'downloading', percent: 0, error: '' })
    try {
      const result = await downloadFile(
        this.manifest.url,
        temporaryPath,
        (downloadedSize, contentLength) => {
          const totalSize = this.manifest.size || contentLength
          const percent = totalSize > 0 ? Math.min(99, Math.round((downloadedSize / totalSize) * 100)) : 0
          this.publishState({ status: 'downloading', percent, error: '' })
        }
      )

      if (this.manifest.size && result.size !== this.manifest.size) {
        throw new Error(`更新下载大小不一致：期望 ${this.manifest.size}，实际 ${result.size}`)
      }
      if (this.manifest.sha512 && result.sha512 !== this.manifest.sha512) {
        throw new Error('更新下载 SHA-512 校验失败')
      }
      if (!this.manifest.sha512) {
        console.warn('[updater] latest-mac.yml 未提供 sha512，已降级为 HTTPS + 完整大小校验')
      }

      fs.renameSync(temporaryPath, destinationPath)
      this.manifest.archivePath = destinationPath
      this.publishState({
        status: 'downloaded',
        version: this.manifest.version,
        releaseName: this.manifest.releaseName,
        releaseDate: this.manifest.releaseDate,
        percent: 100,
        error: ''
      })
      return this.getState()
    } catch (error) {
      fs.rmSync(temporaryPath, { force: true })
      throw error
    }
  }

  install() {
    if (!this.manifest?.archivePath) {
      return this.getState()
    }

    const helperPath = this.getHelperPath()
    if (!fs.existsSync(helperPath)) {
      throw new Error(`更新安装 helper 不存在：${helperPath}`)
    }

    const { appId } = this.getPackageConfig()
    const payload = {
      archivePath: this.manifest.archivePath,
      targetAppPath: this.getCurrentAppBundlePath(),
      expectedBundleId: appId,
      expectedVersion: this.manifest.version,
      resultPath: this.getResultPath(),
      parentPid: process.pid,
      retentionMs: RETENTION_MS
    }

    this.publishState({ status: 'installing', error: '' })
    const helperProcess = require('node:child_process').spawn(
      process.execPath,
      [helperPath, JSON.stringify(payload)],
      {
        detached: true,
        stdio: 'ignore',
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '1'
        }
      }
    )
    helperProcess.unref()
    setImmediate(() => this.app.quit())
    return this.getState()
  }

  consumeInstallResult() {
    const resultPath = this.getResultPath()
    if (!fs.existsSync(resultPath)) {
      return null
    }

    let result
    try {
      result = JSON.parse(fs.readFileSync(resultPath, 'utf8'))
    } catch (error) {
      result = {
        status: 'error',
        error: `读取更新安装结果失败：${error.message}`
      }
    } finally {
      fs.rmSync(resultPath, { force: true })
    }

    if (result.status === 'success') {
      return {
        status: 'installed',
        version: result.version || '',
        releaseName: '',
        releaseDate: '',
        percent: 100,
        error: result.warning || ''
      }
    }

    return {
      status: 'error',
      version: result.version || '',
      releaseName: '',
      releaseDate: '',
      percent: 0,
      error: result.error || '更新安装失败'
    }
  }
}

function createMacUpdateManager(options) {
  return new MacUpdateManager(options)
}

module.exports = {
  createMacUpdateManager
}
