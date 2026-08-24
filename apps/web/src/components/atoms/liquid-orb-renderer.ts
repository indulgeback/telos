/// <reference types="@webgpu/types" />

import { writeLiquidOrbUniforms } from './liquid-orb-uniforms'

const SHADER_URL = '/third-party/liquid-orb/effect.wgsl'

const ENTRY_POINTS = `
struct VOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) i: u32) -> VOut {
  var p = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 3.0, -1.0),
    vec2<f32>(-1.0,  3.0),
  );
  var out: VOut;
  out.pos = vec4<f32>(p[i], 0.0, 1.0);
  let uv01 = (p[i] + vec2<f32>(1.0)) * 0.5;
  out.uv = vec2<f32>(uv01.x, 1.0 - uv01.y);
  return out;
}

@fragment
fn fs_main(in: VOut) -> @location(0) vec4<f32> {
  let c = orbGlassLiquidAnim(in.uv);
  let fc = vec2<f32>(in.uv.x, 1.0 - in.uv.y) * u.size;
  let uv = (2.0 * fc - u.size) / max(min(u.size.x, u.size.y), 1.0);
  let rad = max(u.radius, 0.05);
  let t = u.time * u.speed;
  let contourRad = rad * glsContourScale(uv, t, u.contourDeform);
  let pd = length(uv) / contourRad;
  let ballA = 1.0 - smoothstep(
    0.99 - mfEdgeD(u.edgeSoftness),
    1.01 + mfEdgeD(u.edgeSoftness),
    pd,
  );
  let lum = max(c.r, max(c.g, c.b));
  let q = (2.0 * fc - u.size) / u.size;
  let fitEnd = 1.0;
  let fitFeather = 2.0 / max(min(u.size.x, u.size.y), 1.0);
  let fitStart = min(mix(contourRad, fitEnd, 0.5), fitEnd - fitFeather);
  let fit = 1.0 - smoothstep(fitStart, fitEnd, max(abs(q.x), abs(q.y)));
  let alpha = select(ballA, max(ballA, lum), u.edgeGlow > 0.0);
  return vec4<f32>(c.rgb * fit, clamp(alpha, 0.0, 1.0) * fit);
}
`

interface SharedGpuResources {
  device: GPUDevice
  format: GPUTextureFormat
  pipeline: GPURenderPipeline
}

let sharedResourcesPromise: Promise<SharedGpuResources> | null = null
let shaderSourcePromise: Promise<string> | null = null

async function loadShaderSource() {
  shaderSourcePromise ??= fetch(SHADER_URL).then(async response => {
    if (!response.ok) {
      throw new Error(`Liquid orb shader failed to load: ${response.status}`)
    }
    return `${await response.text()}\n${ENTRY_POINTS}`
  })
  return shaderSourcePromise
}

async function getSharedResources(): Promise<SharedGpuResources> {
  sharedResourcesPromise ??= (async () => {
    if (!navigator.gpu) throw new Error('WebGPU is unavailable')
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) throw new Error('No WebGPU adapter is available')
    const device = await adapter.requestDevice()
    const format = navigator.gpu.getPreferredCanvasFormat()
    const shader = device.createShaderModule({
      label: 'telos-liquid-opal-orb',
      code: await loadShaderSource(),
    })
    const compilation = await shader.getCompilationInfo()
    const errors = compilation.messages.filter(
      message => message.type === 'error'
    )
    if (errors.length > 0) {
      throw new Error(
        errors
          .map(error => `${error.lineNum}:${error.linePos} ${error.message}`)
          .join('\n')
      )
    }

    const pipeline = device.createRenderPipeline({
      label: 'telos-liquid-opal-orb-pipeline',
      layout: 'auto',
      vertex: { module: shader, entryPoint: 'vs_main' },
      fragment: {
        module: shader,
        entryPoint: 'fs_main',
        targets: [{ format }],
      },
      primitive: { topology: 'triangle-list' },
    })

    void device.lost.then(() => {
      sharedResourcesPromise = null
    })
    return { device, format, pipeline }
  })().catch(error => {
    sharedResourcesPromise = null
    throw error
  })

  return sharedResourcesPromise
}

export interface LiquidOrbRenderer {
  requestFrame: () => void
  dispose: () => void
}

export function createLiquidOrbRenderer(options: {
  canvas: HTMLCanvasElement
  shouldAnimate: () => boolean
  onReady: () => void
  onError: (error: Error) => void
}): LiquidOrbRenderer {
  const { canvas, shouldAnimate, onReady, onError } = options
  let disposed = false
  let initialized = false
  let readyNotified = false
  let framePending = false
  let animationFrame = 0
  let uniformBuffer: GPUBuffer | null = null
  let renderFrame: ((now: number) => void) | null = null

  const requestFrame = () => {
    if (disposed || !initialized || framePending || !renderFrame) return
    framePending = true
    animationFrame = requestAnimationFrame(renderFrame)
  }

  void (async () => {
    try {
      const { device, format, pipeline } = await getSharedResources()
      if (disposed) return
      const context = canvas.getContext('webgpu')
      if (!context) throw new Error('WebGPU canvas context is unavailable')
      context.configure({ device, format, alphaMode: 'premultiplied' })

      const values = new Float32Array(128)
      uniformBuffer = device.createBuffer({
        size: values.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      })
      const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
      })
      const startedAt = performance.now()

      const resize = () => {
        const cssSize = Math.max(canvas.clientWidth, canvas.clientHeight)
        const maxDpr = cssSize <= 24 ? 1.5 : 2
        const dpr = Math.min(window.devicePixelRatio || 1, maxDpr)
        const width = Math.max(1, Math.floor(canvas.clientWidth * dpr))
        const height = Math.max(1, Math.floor(canvas.clientHeight * dpr))
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width
          canvas.height = height
        }
      }

      renderFrame = now => {
        framePending = false
        if (disposed || !uniformBuffer) return
        try {
          resize()
          const elapsed = (now - startedAt) / 1000 + 0.65
          writeLiquidOrbUniforms(values, canvas.width, canvas.height, elapsed)
          device.queue.writeBuffer(uniformBuffer, 0, values)
          const encoder = device.createCommandEncoder()
          const pass = encoder.beginRenderPass({
            colorAttachments: [
              {
                view: context.getCurrentTexture().createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                loadOp: 'clear',
                storeOp: 'store',
              },
            ],
          })
          pass.setPipeline(pipeline)
          pass.setBindGroup(0, bindGroup)
          pass.draw(3, 1, 0, 0)
          pass.end()
          device.queue.submit([encoder.finish()])
          if (!readyNotified) {
            readyNotified = true
            onReady()
          }
          if (shouldAnimate() && document.visibilityState === 'visible') {
            requestFrame()
          }
        } catch (error) {
          onError(error instanceof Error ? error : new Error(String(error)))
        }
      }

      initialized = true
      requestFrame()
    } catch (error) {
      if (!disposed) {
        onError(error instanceof Error ? error : new Error(String(error)))
      }
    }
  })()

  return {
    requestFrame,
    dispose: () => {
      disposed = true
      cancelAnimationFrame(animationFrame)
      uniformBuffer?.destroy()
    },
  }
}
