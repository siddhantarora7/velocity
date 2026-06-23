// Thin client for the Velocity FastAPI backend.
// Contract mirrors app.py exactly — note the analyze body uses `distance_m`
// (NOT `di_m`), which is the single most important detail to get right
// alongside the displayed→true pixel conversion done by the caller.

export const API_BASE = 'http://localhost:8000'

export interface UploadResponse {
  video_id: string
  width: number // TRUE pixel width of the source video
  height: number // TRUE pixel height
}

export type JobStatus = 'pending' | 'running' | 'done' | 'error'

export interface StatusResponse {
  status: JobStatus
  error: string | null
}

export interface AnalyzeResult {
  fastest_kmh: number
  launch_kmh: number | null
  kick_found: boolean
  speeds: [number, number][] // [timeSeconds, kmh]
}

export type Point = [number, number]

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body?.detail ?? detail
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail)
  }
  return res.json() as Promise<T>
}

export async function uploadVideo(file: File): Promise<UploadResponse> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: form })
  return asJson<UploadResponse>(res)
}

export function frameUrl(videoId: string): string {
  return `${API_BASE}/frame/${videoId}`
}

export async function analyze(params: {
  videoId: string
  point1: Point // TRUE pixel coordinates
  point2: Point
  distanceM: number
}): Promise<{ job_id: string }> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      video_id: params.videoId,
      point1: params.point1,
      point2: params.point2,
      distance_m: params.distanceM,
    }),
  })
  return asJson<{ job_id: string }>(res)
}

export async function getStatus(jobId: string): Promise<StatusResponse> {
  return asJson<StatusResponse>(await fetch(`${API_BASE}/status/${jobId}`))
}

export async function getResult(jobId: string): Promise<AnalyzeResult> {
  return asJson<AnalyzeResult>(await fetch(`${API_BASE}/result/${jobId}`))
}

export function videoUrl(jobId: string): string {
  return `${API_BASE}/video/${jobId}`
}
