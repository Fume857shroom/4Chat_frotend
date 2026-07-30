import http from './http'

export interface Announce {
  id: number
  userId: number
  title: string
  content: string
  status: number
  createdAt: string
}

export interface AnnounceListResult {
  data: Announce[]
  total: number
  page: number
  limit: number
}

export interface CreateAnnounceDTO {
  title: string
  content: string
}

export async function fetchAnnounces(page = 1, limit = 20): Promise<AnnounceListResult> {
  const response = await http.get<{
    code: number
    data: Announce[]
    total: number
    page: number
    limit: number
  }>('/api/v1/announce', { params: { page, limit } })
  return response.data as unknown as AnnounceListResult
}

export async function createAnnounce(dto: CreateAnnounceDTO): Promise<Announce> {
  const response = await http.post<{ code: number; message: string; data: Announce }>(
    '/api/v1/announce',
    dto,
  )
  return response.data.data
}