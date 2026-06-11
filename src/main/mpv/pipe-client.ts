import net, { Socket } from 'net'
import { EventEmitter } from 'events'

interface PendingRequest {
  resolve: (data: unknown) => void
  reject: (err: Error) => void
  timeout: NodeJS.Timeout
}

/**
 * Windows named-pipe client for mpv JSON IPC protocol.
 * mpv speaks newline-delimited JSON over \\.\pipe\flux-mpv
 */
export class MpvPipeClient extends EventEmitter {
  private pipePath: string
  private socket: Socket | null = null
  private buffer = ''
  private requestId = 1
  private pending = new Map<number, PendingRequest>()
  private reconnectTimer: NodeJS.Timeout | null = null
  private _connected = false

  constructor(pipePath: string) {
    super()
    this.pipePath = pipePath
  }

  get connected(): boolean {
    return this._connected
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this._connected) {
        resolve()
        return
      }

      // Destroy any stale socket from a previous attempt
      if (this.socket) {
        this.socket.removeAllListeners()
        this.socket.destroy()
        this.socket = null
      }

      const socket = net.createConnection(this.pipePath)
      this.socket = socket

      // Hard timeout per attempt: if neither connect nor error fires in 800ms,
      // the pipe is in a connecting/busy state — abort and let connectWithRetry retry.
      const timeout = setTimeout(() => {
        socket.removeAllListeners()
        socket.destroy()
        reject(new Error('connect attempt timed out'))
      }, 800)

      const cleanup = () => clearTimeout(timeout)

      const onConnect = () => {
        cleanup()
        this._connected = true
        socket.removeListener('error', onError)
        socket.on('error', (err) => this.handleError(err))
        this.emit('connected')
        resolve()
      }

      const onError = (err: Error) => {
        cleanup()
        socket.removeListener('connect', onConnect)
        reject(err)
      }

      socket.once('connect', onConnect)
      socket.once('error', onError)
      socket.on('data', (data) => this.handleData(data))
      socket.on('close', () => this.handleClose())
      socket.on('end', () => this.handleClose())
    })
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this._connected = false
    if (this.socket) {
      this.socket.destroy()
      this.socket = null
    }
    // Reject all pending requests
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timeout)
      pending.reject(new Error('Connection closed'))
    }
    this.pending.clear()
  }

  send(command: unknown[], requestId?: number): Promise<unknown> {
    const id = requestId ?? this.requestId++
    const msg = JSON.stringify({ command, request_id: id }) + '\n'

    return new Promise((resolve, reject) => {
      if (!this._connected || !this.socket) {
        reject(new Error('Not connected to mpv IPC pipe'))
        return
      }

      const timeout = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`mpv IPC timeout for command: ${JSON.stringify(command)}`))
      }, 10000)

      this.pending.set(id, { resolve, reject, timeout })

      this.socket.write(msg, (err) => {
        if (err) {
          clearTimeout(timeout)
          this.pending.delete(id)
          reject(err)
        }
      })
    })
  }

  sendNoReply(command: unknown[]): void {
    if (!this._connected || !this.socket) return
    const msg = JSON.stringify({ command }) + '\n'
    this.socket.write(msg)
  }

  private handleData(data: Buffer): void {
    this.buffer += data.toString('utf8')
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(trimmed)
      } catch {
        continue
      }

      // Response to a command
      if ('request_id' in parsed && typeof parsed.request_id === 'number') {
        const pending = this.pending.get(parsed.request_id)
        if (pending) {
          clearTimeout(pending.timeout)
          this.pending.delete(parsed.request_id)
          if (parsed.error === 'success') {
            pending.resolve(parsed.data)
          } else {
            pending.reject(new Error(String(parsed.error) || 'mpv IPC error'))
          }
        }
        continue
      }

      // Event notification
      if ('event' in parsed) {
        this.emit('event', parsed)
        this.emit(`event:${parsed.event}`, parsed)
      }
    }
  }

  private handleError(err: Error): void {
    this._connected = false
    this.emit('error', err)
  }

  private handleClose(): void {
    this._connected = false
    // Reject pending
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timeout)
      pending.reject(new Error('Connection closed'))
    }
    this.pending.clear()
    this.emit('disconnected')
  }
}
