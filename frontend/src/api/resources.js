import request from '@/utils/request'

export function getResourceSites() {
  return request.get('/api/v1/resources/sites')
}

export function getResourceSiteDetail(siteId) {
  return request.get(`/api/v1/resources/sites/${siteId}`)
}

export function toggleResourceSite(siteId) {
  return request.post(`/api/v1/resources/sites/${siteId}/toggle`)
}

export function testResourceSite(siteId) {
  return request.post(`/api/v1/resources/sites/${siteId}/test`)
}

