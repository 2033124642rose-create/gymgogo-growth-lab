import { assessPose, drawPose, EMPTY_GROUPS } from './pose'
import type { JointGroups, Point, PoseFrame, Tracking } from './pose'

export type Phase = 'idle' | 'requesting' | 'loading' | 'running' | 'error'
export interface CameraState { phase: Phase; tracking: Tracking; groups: JointGroups; message: string; preview?: boolean; facing?: string; backend?: string }
interface WorkerReply { type: 'ready' | 'result' | 'error' | 'progress'; landmarks?: Point[]; worldLandmarks?: Point[]; timestamp?: number; inferenceMs?: number; backend?: string; code?: string; stage?: string }
export interface PoseWorker {
  onmessage: ((event: MessageEvent<WorkerReply>) => void) | null
  onerror: ((event: ErrorEvent) => void) | null
  postMessage(message: unknown, transfer?: Transferable[]): void
  terminate(): void
}
export interface CameraEnvironment {
  getMedia(facing?: 'user' | 'environment'): Promise<MediaStream>
  createWorker(): PoseWorker
  getFrame(video: HTMLVideoElement): Promise<ImageBitmap>
  schedule(callback: FrameRequestCallback): number
  cancel(id: number): void
  now(): number
}
const environment: CameraEnvironment = {
  getMedia: (facing = 'user') => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      return Promise.reject(new Error('unsupported'))
    }
    return navigator.mediaDevices.getUserMedia({ audio: false, video: {
      facingMode: { ideal: facing }, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 },
    } })
  },
  createWorker: () => {
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') throw new Error('unsupported-model')
    return new Worker('/pose-worker.js') as PoseWorker
  },
  getFrame: video => {
    const width = Math.min(640, video.videoWidth)
    return createImageBitmap(video, { resizeWidth: width, resizeHeight: Math.round(video.videoHeight * width / video.videoWidth) })
  },
  schedule: callback => requestAnimationFrame(callback), cancel: id => cancelAnimationFrame(id), now: () => performance.now(),
}

export function cameraError(error: unknown): string {
  // DOMException may come from a different realm and need not be instanceof Error.
  const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return '摄像头权限未获授权。请在浏览器地址栏允许摄像头后重试。'
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return '未找到摄像头，请连接设备后重试。'
  if (name === 'NotReadableError' || name === 'TrackStartError') return '摄像头无法读取，可能正被其他应用占用，请关闭占用应用后重试。'
  if (name === 'OverconstrainedError') return '摄像头不支持当前采集条件，请换用其他摄像头后重试。'
  if (error instanceof Error && error.message === 'unsupported') return '此环境不支持摄像头或后台识别。请使用新版 Chrome / Edge，通过 localhost 或 HTTPS 打开页面。'
  return '摄像头启动失败，请检查设备连接、系统权限后重试。'
}

const MODEL_STAGES: Record<string,string> = { script:'正在加载识别程序', wasm:'正在准备 WASM 运行环境', model:'正在下载并初始化姿态模型（首次可能较慢）', cpu:'正在使用 CPU 兼容模式初始化' }

const initialState = (): CameraState => ({ phase: 'idle', tracking: 'waiting', groups: { ...EMPTY_GROUPS }, message: '' })

// Session generations prevent late permission grants / image captures from reviving a stopped session.
export class CameraController {
  state = initialState()
  private generation = 0
  private stream: MediaStream | null = null
  private worker: PoseWorker | null = null
  private animation = 0
  private watchdog: ReturnType<typeof setTimeout> | undefined
  private inFlight = false
  private lastFrameTime = -1
  private lastCapture = -Infinity
  private interval = 1000 / 15
  private hasSeen = false
  private inferencePaused = false
  private inferenceEpoch = 0
  private resumeAfter = -Infinity
  setInferencePaused(paused: boolean) {
    if (this.inferencePaused === paused) return
    this.inferencePaused = paused; this.inferenceEpoch++
    this.env.cancel(this.animation)
    if (this.state.phase === 'running') clearTimeout(this.watchdog)
    this.hasSeen = false; this.candidate = 'waiting'; this.candidateCount = 0
    this.lastFrameTime = -1; this.lastCapture = -Infinity
    this.canvas.getContext('2d')?.clearRect(0,0,this.canvas.width,this.canvas.height)
    this.onPose?.(null)
    if (!paused && this.state.phase === 'running') {
      this.resumeAfter = this.env.now()
      this.update({tracking:'waiting',groups:{...EMPTY_GROUPS}})
      if (this.inFlight) this.watchdog = setTimeout(()=>this.fail('姿态识别恢复超时，请重新开启摄像头。'),10000)
      this.animation = this.env.schedule(()=>this.tick(this.generation))
    }
  }
  private candidate: Tracking = 'waiting'
  private candidateCount = 0
  private ended = () => this.fail('摄像头连接已中断或系统权限已撤回。请检查设备后重新开启。')

  constructor(private video: HTMLVideoElement, private canvas: HTMLCanvasElement,
    private onState: (state: CameraState) => void, private env = environment, private onPose?: (frame: PoseFrame | null) => void) {}

  private update(patch: Partial<CameraState>) {
    this.state = { ...this.state, ...patch }
    this.onState(this.state)
  }

  async start(facing: 'user' | 'environment' = 'user') {
    if (['requesting', 'loading', 'running'].includes(this.state.phase)) return
    this.stop(false)
    const generation = this.generation
    this.update({ ...initialState(), phase: 'requesting', message: '请在浏览器提示中允许摄像头。也可以随时取消。' })
    try {
      const stream = await this.env.getMedia(facing)
      if (generation !== this.generation) { stream.getTracks().forEach(track => track.stop()); return }
      this.stream = stream
      stream.getVideoTracks().forEach(track => track.addEventListener('ended', this.ended))
      this.video.muted = true
      this.video.playsInline = true
      this.video.autoplay = true
      this.video.srcObject = stream
      this.update({ preview: true, facing: stream.getVideoTracks()[0]?.getSettings?.().facingMode || facing })
      this.watchdog = setTimeout(() => this.fail('视频启动超时，请检查摄像头后重试。'), 15_000)
      try { await this.video.play() }
      catch {
        if(generation===this.generation) this.modelFailed('摄像头已连接，但视频未能播放。请点击恢复视频画面；仍失败请手动关闭后重试。')
        return
      }
      if (generation !== this.generation) return
      clearTimeout(this.watchdog)
      this.loadModel(generation)
    } catch (error) {
      if (generation === this.generation) this.fail(cameraError(error))
    }
  }


  async resumePreview() {
    if (!this.stream || !this.video.paused) return
    const generation=this.generation
    try { await this.video.play() }
    catch { if(generation===this.generation) this.modelFailed('视频播放被浏览器暂停，请点击恢复视频画面；若仍无画面，请关闭后手动重开摄像头。') }
  }
  retryModel() {
    if (!this.stream || !this.state.preview || this.state.phase !== 'error') return
    this.loadModel(this.generation)
  }
  private modelFailed(message: string) {
    this.generation++
    this.env.cancel(this.animation)
    this.canvas.getContext('2d')?.clearRect(0,0,this.canvas.width,this.canvas.height)
    clearTimeout(this.watchdog)
    if(this.worker) { this.worker.onmessage=null; this.worker.terminate() }; this.worker = null
    this.inFlight = false
    this.onPose?.(null)
    this.update({phase:'error', preview:true, tracking:'waiting', groups:{...EMPTY_GROUPS}, message})
  }
  private loadModel(generation: number) {
    try {
      this.update({ phase: 'loading', message: '画面已开启，正在加载本地姿态模型；首次可能需要数秒。' })
      const worker = this.env.createWorker()
      this.worker = worker
      this.watchdog = setTimeout(() => this.modelFailed('姿态模型加载超时。画面保留，请检查网络后点击重试识别。'), 45_000)
      worker.onerror = event => { event.preventDefault?.(); if (generation === this.generation) this.modelFailed('姿态识别线程启动失败。画面保留，请使用新版 Safari / Chrome / Edge 后重试识别。') }
      worker.onmessage = ({ data }) => {
        if (generation !== this.generation) return
        if (data.type === 'progress') {
          this.update({message: MODEL_STAGES[data.stage ?? ''] || '正在初始化姿态识别…'})
          return
        }
        clearTimeout(this.watchdog)
        if (data.type === 'ready') {
          this.update({ phase: 'running', tracking: 'waiting', message: '', backend: data.backend })
          if (!this.inferencePaused) this.animation = this.env.schedule(() => this.tick(generation))
        } else if (data.type === 'result') {
          this.inFlight = false
          if (this.inferencePaused || (data.timestamp ?? -Infinity) < this.resumeAfter) return
          this.interval = Math.max(1000 / 15, Math.min(250, (data.inferenceMs ?? 0) * 1.15))
          const points = data.landmarks ?? []
          drawPose(this.canvas, points)
          this.onPose?.({ landmarks: points, worldLandmarks: data.worldLandmarks ?? [], timestamp: data.timestamp ?? this.env.now() })
          const assessment = assessPose(points, this.hasSeen)
          if (points.length > 0) this.hasSeen = true
          this.candidateCount = this.candidate === assessment.tracking ? this.candidateCount + 1 : 1
          this.candidate = assessment.tracking
          // Three consecutive observations reduce status flicker without retaining stale skeletons.
          if (this.candidateCount >= 3 && (this.state.tracking !== assessment.tracking ||
            JSON.stringify(this.state.groups) !== JSON.stringify(assessment.groups))) {
            this.update({ tracking: assessment.tracking, groups: assessment.groups })
          }
        } else {
          data.code === 'model' ? this.modelFailed(`姿态模型加载失败（${MODEL_STAGES[data.stage ?? ''] || '初始化阶段'}）。请检查网络并重试识别。`) : this.fail('姿态识别发生错误，摄像头已关闭。请重试或更换新版 Chrome / Edge。')
        }
      }
      worker.postMessage({ type: 'init' })
    } catch (error) { this.modelFailed(error instanceof Error && error.message==='unsupported-model' ? '视频已开启，但此浏览器不支持后台姿态识别。请更新 iOS / Safari 或 Chrome；仅预览不能计数。' : '姿态识别线程初始化失败。请更新浏览器后重试识别。') }
  }

  private tick(generation: number) {
    if (generation !== this.generation || this.state.phase !== 'running' || this.inferencePaused) return
    this.animation = this.env.schedule(() => this.tick(generation))
    const now = this.env.now()
    if (this.inFlight || this.video.readyState < 2 || this.video.videoWidth === 0 ||
      this.video.currentTime === this.lastFrameTime || now - this.lastCapture < this.interval) return
    this.inFlight = true
    this.lastFrameTime = this.video.currentTime
    this.lastCapture = now
    this.watchdog = setTimeout(() => this.fail('姿态识别响应超时，摄像头已关闭。请关闭其他高负载应用后重试。'), 10_000)
    const epoch = this.inferenceEpoch
    void this.env.getFrame(this.video).then(frame => {
      if (generation !== this.generation || !this.worker || this.inferencePaused || epoch !== this.inferenceEpoch) {
        frame.close()
        if(generation===this.generation){this.inFlight = false;clearTimeout(this.watchdog)}
        return
      }
      // Assigning canvas dimensions clears it; do this only when the source resolution changes.
      if (this.canvas.width !== frame.width) this.canvas.width = frame.width
      if (this.canvas.height !== frame.height) this.canvas.height = frame.height
      try {
        this.worker.postMessage({ type: 'frame', frame, timestamp: now }, [frame])
      } catch (error) {
        frame.close()
        throw error
      }
    }).catch(() => {
      if(generation===this.generation&&epoch!==this.inferenceEpoch){this.inFlight=false;clearTimeout(this.watchdog);return}
      if (generation === this.generation && epoch === this.inferenceEpoch) this.fail('无法读取摄像头画面，摄像头已关闭。请使用新版 Chrome / Edge 后重试。')
    })
  }

  private fail(message: string) {
    this.stop(false)
    this.update({ ...initialState(), phase: 'error', message })
  }

  stop(notify = true) {
    this.generation++
    this.env.cancel(this.animation)
    clearTimeout(this.watchdog)
    this.stream?.getVideoTracks().forEach(track => track.removeEventListener('ended', this.ended))
    this.stream?.getTracks().forEach(track => track.stop())
    this.stream = null
    this.worker?.terminate()
    this.worker = null
    this.video.pause()
    this.video.srcObject = null
    this.canvas.getContext('2d')?.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.inFlight = false
    this.hasSeen = false
    this.candidate = 'waiting'
    this.candidateCount = 0
    this.lastFrameTime = -1
    this.lastCapture = -Infinity
    this.interval = 1000 / 15
    this.state = initialState()
    this.onPose?.(null)
    if (notify) this.onState(this.state)
  }
}
