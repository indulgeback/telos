/**
 * API 客户端模拟
 */

const mockApiClient = {
  syncUser: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getUserProfile: jest.fn(),
  updateUserProfile: jest.fn(),
}

export const apiClient = mockApiClient
export default mockApiClient
