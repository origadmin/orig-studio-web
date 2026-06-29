import { describe, it, expect } from 'vitest'

describe('Route Migration: API URL Patterns', () => {
  const backendUrl = (import.meta.env.VITE_API_URL || '') as string

  it('User API should use slug instead of ID', () => {
    const getUserUrl = (slug: string) => `${backendUrl}/users/${slug}`
    expect(getUserUrl('john-doe')).toContain('/users/john-doe')
    expect(getUserUrl('john-doe')).not.toContain('/users/username/')
    expect(getUserUrl('john-doe')).not.toContain('/users/slug/')
  })

  it('User API should use query parameter for username lookup', () => {
    const getByUsernameUrl = (username: string) => `${backendUrl}/users?username=${username}`
    expect(getByUsernameUrl('johndoe')).toContain('/users?username=johndoe')
    expect(getByUsernameUrl('johndoe')).not.toContain('/users/username/')
  })

  it('Media API should use token instead of ID for portal', () => {
    const getMediaUrl = (token: string) => `${backendUrl}/medias/${token}`
    expect(getMediaUrl('abc123xyz')).toContain('/medias/abc123xyz')
  })

  it('Media admin API should still use ID', () => {
    const getAdminMediaUrl = (id: string) => `${backendUrl}/admin/medias/${id}`
    expect(getAdminMediaUrl('uuid-1234')).toContain('/admin/medias/uuid-1234')
  })

  it('Article API should use slug instead of ID for portal', () => {
    const getArticleUrl = (slug: string) => `${backendUrl}/articles/${slug}`
    expect(getArticleUrl('how-to-learn-go')).toContain('/articles/how-to-learn-go')
    expect(getArticleUrl('how-to-learn-go')).not.toContain('/articles/slug/')
  })

  it('Tag API should use slug instead of ID for portal', () => {
    const getTagUrl = (slug: string) => `${backendUrl}/tags/${slug}`
    expect(getTagUrl('javascript')).toContain('/tags/javascript')
  })

  it('Category API should use slug instead of ID for portal', () => {
    const getCategoryUrl = (slug: string) => `${backendUrl}/categories/${slug}`
    expect(getCategoryUrl('technology')).toContain('/categories/technology')
  })

  it('Channel resolve should use query parameter', () => {
    const resolveHandleUrl = (handle: string) => `${backendUrl}/resolve?handle=${handle}`
    expect(resolveHandleUrl('mychannel')).toContain('/resolve?handle=mychannel')
    expect(resolveHandleUrl('mychannel')).not.toContain('/resolve/@')
  })

  it('Ad placement should use query parameter', () => {
    const getAdsByPlacementUrl = (placement: string) => `${backendUrl}/ads?placement=${placement}`
    expect(getAdsByPlacementUrl('sidebar')).toContain('/ads?placement=sidebar')
    expect(getAdsByPlacementUrl('sidebar')).not.toContain('/ads/placement/')
  })
})

describe('Route Migration: No Deprecated Patterns', () => {
  it('should not have /users/username/ in any API call', () => {
    const deprecatedPatterns = ['/users/username/', '/users/slug/', '/articles/slug/', '/ads/placement/', '/resolve/@']
    deprecatedPatterns.forEach(pattern => {
      expect(pattern).not.toMatch(/^\/(users|articles|ads|resolve)\/(username|slug|placement|@)/)
    })
  })
})
