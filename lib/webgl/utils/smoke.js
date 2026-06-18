import {
  abs,
  clamp,
  dot,
  exp,
  Fn,
  float,
  If,
  length,
  NodeUpdateType,
  nodeObject,
  passTexture,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl'

import {
  ClampToEdgeWrapping,
  HalfFloatType,
  LinearFilter,
  NearestFilter,
  NoColorSpace,
  NodeMaterial,
  QuadMesh,
  RendererUtils,
  RenderTarget,
  RGBAFormat,
  TempNode,
  Vector2,
} from 'three/webgpu'

// ─── Double-buffered render target ───────────────────────────────────────────

class DoubleRT {
  constructor({
    width = 1,
    height = 1,
    format = RGBAFormat,
    type = HalfFloatType,
    minFilter = LinearFilter,
    magFilter = LinearFilter,
    wrapS = ClampToEdgeWrapping,
    wrapT = ClampToEdgeWrapping,
    generateMipmaps = false,
  } = {}) {
    this._config = {
      colorSpace: NoColorSpace,
      format,
      type,
      minFilter,
      magFilter,
      wrapS,
      wrapT,
      generateMipmaps,
      depthBuffer: false,
    }
    this.read = null
    this.write = null
    this.phase = false
    this.setSize(width, height)
  }

  _createRT(w, h) {
    const rt = new RenderTarget(w, h, this._config)
    rt.texture.colorSpace = NoColorSpace
    return rt
  }

  setSize(w, h) {
    if (this.read) this.read.dispose()
    if (this.write) this.write.dispose()
    this.width = w
    this.height = h
    this.read = this._createRT(w, h)
    this.write = this._createRT(w, h)
    this.phase = true
  }

  swap() {
    this.phase = !this.phase
  }

  dispose() {
    if (this.read) this.read.dispose()
    if (this.write) this.write.dispose()
    this.read = this.write = null
  }
}

// ─── Single render target ─────────────────────────────────────────────────────

class SingleRT {
  constructor({
    width = 1,
    height = 1,
    format = RGBAFormat,
    type = HalfFloatType,
    minFilter = NearestFilter,
    magFilter = NearestFilter,
    wrapS = ClampToEdgeWrapping,
    wrapT = ClampToEdgeWrapping,
    generateMipmaps = false,
  } = {}) {
    this._config = {
      colorSpace: NoColorSpace,
      format,
      type,
      minFilter,
      magFilter,
      wrapS,
      wrapT,
      generateMipmaps,
      depthBuffer: false,
    }
    this.rt = null
    this.setSize(width, height)
  }

  setSize(w, h) {
    if (this.rt) this.rt.dispose()
    this.width = w
    this.height = h
    this.rt = new RenderTarget(w, h, this._config)
    this.rt.texture.colorSpace = NoColorSpace
  }

  get texture() {
    return this.rt.texture
  }

  dispose() {
    if (this.rt) this.rt.dispose()
    this.rt = null
  }
}

// ─── Shader programs (TSL) ───────────────────────────────────────────────────

const shaders = {
  splatVelocity: Fn(({ readTex, size, point, radius, force }) => {
    const n = uv()
    const s = vec2(n.sub(point)).toVar()
    s.x.mulAssign(size.x.div(size.y))
    const r = float(
      exp(
        dot(s, s)
          .negate()
          .div(radius.div(float(100)))
      )
    )
    const c = texture(readTex, n).xy.add(vec2(force.x.mul(r), force.y.mul(r)))
    const lim = float(500)
    const p = length(c)
    const v = c.mul(clamp(lim.div(p.max(lim)), 0, 1))
    return vec4(v, 0, 1)
  }),

  splatDensity: Fn(({ readTex, size, point, radius, force }) => {
    const n = uv()
    const s = vec2(n.sub(point)).toVar()
    s.x.mulAssign(size.x.div(size.y))
    const r = float(
      exp(
        dot(s, s)
          .negate()
          .div(radius.div(float(100)))
      )
    )
    const o = texture(readTex, n).rgb
    const c = vec3(force.x.mul(r), force.y.mul(r), r)
    return vec4(o.add(c), 1)
  }),

  curl: Fn(({ tVelocity, size, neighborStride }) => {
    const h = uv()
    const i = vec2(1).div(size).mul(neighborStride)
    const n = vec2(0.5).div(size)
    const L = clamp(h.sub(vec2(i.x, 0)), n, vec2(1).sub(n))
    const R = clamp(h.add(vec2(i.x, 0)), n, vec2(1).sub(n))
    const D = clamp(h.sub(vec2(0, i.y)), n, vec2(1).sub(n))
    const U = clamp(h.add(vec2(0, i.y)), n, vec2(1).sub(n))
    const vL = texture(tVelocity, L).y
    const vR = texture(tVelocity, R).y
    const vU = texture(tVelocity, U).x
    const vD = texture(tVelocity, D).x
    const b = float(0.5).mul(vR.sub(vL).sub(vU).add(vD))
    return vec4(b, 0, 0, 1)
  }),

  vorticity: Fn(
    ({ tCurl, readTex, size, neighborStride, curlStrength, deltaTime }) => {
      const s = uv()
      const r = vec2(1).div(size).mul(neighborStride)
      const o = vec2(0.5).div(size)
      const cL = clamp(s.sub(vec2(r.x, 0)), o, vec2(1).sub(o))
      const cR = clamp(s.add(vec2(r.x, 0)), o, vec2(1).sub(o))
      const cD = clamp(s.sub(vec2(0, r.y)), o, vec2(1).sub(o))
      const cU = clamp(s.add(vec2(0, r.y)), o, vec2(1).sub(o))
      const x = texture(tCurl, cL).x
      const b = texture(tCurl, cR).x
      const m = texture(tCurl, cU).x
      const P = texture(tCurl, cD).x
      const B = clamp(texture(tCurl, s).x, -100, 100)
      const w = vec2(abs(m).sub(abs(P)), abs(b).sub(abs(x)))
        .mul(0.5)
        .toVar()
      w.divAssign(length(w).add(1e-4))
      w.mulAssign(curlStrength.mul(B))
      w.y.assign(w.y.negate())
      const K = texture(readTex, s).xy
      return vec4(K.add(w.mul(deltaTime)), 0, 1)
    }
  ),

  divergence: Fn(({ tVelocity, size, neighborStride, useBoundaries }) => {
    const i = uv()
    const n = vec2(1).div(size).mul(neighborStride)
    const s = vec2(0.5).div(size)
    const r = clamp(i.sub(vec2(n.x, 0)), s, vec2(1).sub(s)).toVar()
    const o = clamp(i.add(vec2(n.x, 0)), s, vec2(1).sub(s)).toVar()
    const c = clamp(i.sub(vec2(0, n.y)), s, vec2(1).sub(s)).toVar()
    const l = clamp(i.add(vec2(0, n.y)), s, vec2(1).sub(s)).toVar()
    const p = texture(tVelocity, r).x.toVar()
    const v = texture(tVelocity, o).x.toVar()
    const x = texture(tVelocity, l).y.toVar()
    const bv = texture(tVelocity, c).y.toVar()
    const m = texture(tVelocity, i).xy
    if (useBoundaries === true) {
      const B = float(1).div(size)
      const w = float(1).sub(B)
      If(r.x.lessThan(B), () => {
        p.assign(m.x.negate())
      })
      If(o.x.greaterThan(w), () => {
        v.assign(m.x.negate())
      })
      If(l.y.greaterThan(w), () => {
        x.assign(m.y.negate())
      })
      If(c.y.lessThan(B), () => {
        bv.assign(m.y.negate())
      })
    }
    const P = float(0.5).mul(v.sub(p).add(x).sub(bv))
    return vec4(P, 0, 0, 1)
  }),

  clearPressure: Fn(({ readTex, pressureDissipation }) => {
    return texture(readTex, uv()).mul(pressureDissipation)
  }),

  pressure: Fn(
    ({ tDivergence, readTex, size, neighborStride, pressureFactor }) => {
      const n = uv()
      const s = vec2(1).div(size).mul(neighborStride)
      const r = vec2(0.5).div(size)
      const oL = clamp(n.sub(vec2(s.x, 0)), r, vec2(1).sub(r))
      const oR = clamp(n.add(vec2(s.x, 0)), r, vec2(1).sub(r))
      const oD = clamp(n.sub(vec2(0, s.y)), r, vec2(1).sub(r))
      const oU = clamp(n.add(vec2(0, s.y)), r, vec2(1).sub(r))
      const v = texture(readTex, oL).x
      const x = texture(readTex, oR).x
      const bv = texture(readTex, oD).x
      const m = texture(readTex, oU).x
      const P = texture(tDivergence, n).x
      const B = pressureFactor.mul(v.add(x).add(m).add(bv).sub(P))
      return vec4(B, 0, 0, 1)
    }
  ),

  gradient: Fn(({ tPressure, readTex, size, neighborStride }) => {
    const i = uv()
    const n = vec2(1).div(size).mul(neighborStride)
    const s = vec2(0.5).div(size)
    const r = clamp(i.sub(vec2(n.x, 0)), s, vec2(1).sub(s))
    const o = clamp(i.add(vec2(n.x, 0)), s, vec2(1).sub(s))
    const c = clamp(i.sub(vec2(0, n.y)), s, vec2(1).sub(s))
    const l = clamp(i.add(vec2(0, n.y)), s, vec2(1).sub(s))
    const p = texture(tPressure, r).x
    const v = texture(tPressure, o).x
    const x = texture(tPressure, l).x
    const bv = texture(tPressure, c).x
    const m = texture(readTex, i).xy.toVar()
    m.subAssign(vec2(v.sub(p), x.sub(bv)).mul(0.5))
    return vec4(m, 0, 1)
  }),

  advectVelocity: Fn(({ readTex, size, deltaTime, advectionDissipation }) => {
    const i = uv()
    const n = vec2(1).div(size)
    const s = texture(readTex, i).xy
    const r = float(500)
    const o = length(s)
    const c = s.mul(clamp(r.div(o.max(r)), 0, 1))
    const l = clamp(i.sub(deltaTime.mul(c.mul(n))), 0, 1)
    const p = texture(readTex, l).mul(advectionDissipation)
    return vec4(p.rg, 0, 1)
  }),

  advectDensity: Fn(
    ({ tVelocity, readTex, simRes, deltaTime, advectionDissipation }) => {
      const n = uv()
      const s = vec2(1).div(simRes)
      const r = texture(tVelocity, n).xy
      const o = float(500)
      const c = length(r)
      const l = r.mul(clamp(o.div(c.max(o)), 0, 1))
      const p = clamp(n.sub(deltaTime.mul(l.mul(s))), 0, 1)
      const v = texture(readTex, p).mul(advectionDissipation)
      return vec4(v.rgb, 1)
    }
  ),
}

// ─── Helper: create a NodeMaterial from a fragment node ──────────────────────

function makeMaterial(fragmentNode) {
  const mat = new NodeMaterial()
  mat.fragmentNode = fragmentNode
  mat.depthTest = false
  mat.depthWrite = false
  return mat
}

// ─── Main simulation node ─────────────────────────────────────────────────────

let _savedRendererState

class SmokeNodeRTT extends TempNode {
  static get type() {
    return 'SmokeNodeRTT'
  }

  constructor(opts = {}) {
    super()

    const cfg = {
      speedFactor: 1,
      simRes: 128,
      dyeRes: 512,
      iterations: 3,
      densityDissipation: 0.97,
      velocityDissipation: 0.98,
      pressureDissipation: 0.8,
      curlStrength: 20,
      pressureFactor: 0.2,
      radius: 0.1,
      useBoundaries: true,
      pointerScale: 45,
      neighborStride: 1,
      ...opts,
    }

    this._useBoundaries = cfg.useBoundaries

    const {
      simRes,
      dyeRes,
      velocityDissipation,
      pressureDissipation,
      curlStrength,
      pressureFactor,
      radius,
    } = cfg

    this.simRes = uniform(new Vector2(simRes, simRes))
    this.dyeRes = uniform(new Vector2(dyeRes, dyeRes))
    this.deltaTime = uniform(0.016)

    this._speedFactor = cfg.speedFactor
    this._advectionDissipation = uniform(velocityDissipation)
    this._baseIterations = cfg.iterations
    this.iterations = Math.round(cfg.iterations * (1 / cfg.speedFactor))
    this._accumulatedTime = 0
    this._timeStep = 0.016
    this._subSteps = Math.max(1, Math.round(1 / cfg.speedFactor))

    this.densityDissipation = cfg.densityDissipation
    this.velocityDissipation = velocityDissipation
    this.pressureDissipation = uniform(pressureDissipation)
    this.pressureFactor = uniform(pressureFactor)
    this.curlStrength = uniform(curlStrength)

    this.point = uniform(new Vector2(0, 0), 'vec2')
    this.force = uniform(new Vector2(0, 0), 'vec2')
    this.radius = uniform(radius)
    this.splats = []

    if (cfg.pointer instanceof Vector2) {
      this.pointer = uniform(cfg.pointer, 'vec2')
    } else if (cfg.pointer && cfg.pointer.value instanceof Vector2) {
      this.pointer = cfg.pointer
    } else {
      this.pointer = uniform(new Vector2(0, 0), 'vec2')
    }

    this._prevPointer = new Vector2(this.pointer.value.x, this.pointer.value.y)
    this._hasPrevPointer = false
    this._pointerScale = cfg.pointerScale
    this._rendererSize = new Vector2()
    this.neighborStride = uniform(cfg.neighborStride)

    this._resized = false
    this._resizePending = false
    this._pendingSimRes = simRes
    this._pendingDyeRes = dyeRes

    this._velocity = new DoubleRT({
      width: simRes,
      height: simRes,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
    })
    this._density = new DoubleRT({
      width: dyeRes,
      height: dyeRes,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
    })
    this._pressure = new DoubleRT({
      width: simRes,
      height: simRes,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
    })
    this._curl = new SingleRT({
      width: simRes,
      height: simRes,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
    })
    this._divergence = new SingleRT({
      width: simRes,
      height: simRes,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
    })

    this._textureNode = passTexture(this, this._density.read.texture)
    this.updateBeforeType = NodeUpdateType.FRAME

    this._quadA = new QuadMesh()
    this._quadB = new QuadMesh()
    this._useQuadA = true

    this._materialsBuilt = false
    this._builtSimRes = simRes
    this._builtDyeRes = dyeRes
    this._builtUseBoundaries = this._useBoundaries
  }

  getTextureNode() {
    return this._textureNode
  }

  get useBoundaries() {
    return this._useBoundaries
  }
  set useBoundaries(val) {
    const v = !!val
    if (v !== this._useBoundaries) {
      this._useBoundaries = v
      this._resizePending = true
    }
  }

  _updateSpeedFactor(val) {
    this._speedFactor = val
    this._subSteps = Math.max(1, Math.round(1 / val))
    this.iterations = Math.round(this._baseIterations * (1 / val))
  }

  setSize() {
    const sim = this.simRes.value.x
    const dye = this.dyeRes.value.x
    const sizeChanged = sim !== this._builtSimRes || dye !== this._builtDyeRes
    const boundaryChanged = this._useBoundaries !== this._builtUseBoundaries
    if (sizeChanged || boundaryChanged) {
      this._pendingSimRes = sim
      this._pendingDyeRes = dye
      this._resizePending = true
    }
  }

  _buildMaterials() {
    const {
      splatVelocity,
      splatDensity,
      curl,
      vorticity,
      divergence,
      clearPressure,
      pressure,
      gradient,
      advectVelocity,
      advectDensity,
    } = shaders

    const mk = makeMaterial
    const vel = this._velocity
    const den = this._density

    this._splatVelocityRead = mk(
      splatVelocity({
        readTex: vel.read.texture,
        size: this.simRes,
        point: this.point,
        radius: this.radius,
        force: this.force,
      })
    )
    this._splatVelocityWrite = mk(
      splatVelocity({
        readTex: vel.write.texture,
        size: this.simRes,
        point: this.point,
        radius: this.radius,
        force: this.force,
      })
    )
    this._splatDensityRead = mk(
      splatDensity({
        readTex: den.read.texture,
        size: this.dyeRes,
        point: this.point,
        radius: this.radius,
        force: this.force,
      })
    )
    this._splatDensityWrite = mk(
      splatDensity({
        readTex: den.write.texture,
        size: this.dyeRes,
        point: this.point,
        radius: this.radius,
        force: this.force,
      })
    )

    this._curlRead = mk(
      curl({
        tVelocity: vel.read.texture,
        size: this.simRes,
        neighborStride: this.neighborStride,
      })
    )
    this._curlWrite = mk(
      curl({
        tVelocity: vel.write.texture,
        size: this.simRes,
        neighborStride: this.neighborStride,
      })
    )

    this._vorticityRead = mk(
      vorticity({
        tCurl: this._curl.texture,
        readTex: vel.read.texture,
        size: this.simRes,
        neighborStride: this.neighborStride,
        curlStrength: this.curlStrength,
        deltaTime: this.deltaTime,
      })
    )
    this._vorticityWrite = mk(
      vorticity({
        tCurl: this._curl.texture,
        readTex: vel.write.texture,
        size: this.simRes,
        neighborStride: this.neighborStride,
        curlStrength: this.curlStrength,
        deltaTime: this.deltaTime,
      })
    )

    this._divergenceRead = mk(
      divergence({
        tVelocity: vel.read.texture,
        size: this.simRes,
        neighborStride: this.neighborStride,
        useBoundaries: this._useBoundaries,
      })
    )
    this._divergenceWrite = mk(
      divergence({
        tVelocity: vel.write.texture,
        size: this.simRes,
        neighborStride: this.neighborStride,
        useBoundaries: this._useBoundaries,
      })
    )

    this._clearPressureRead = mk(
      clearPressure({
        readTex: this._pressure.read.texture,
        pressureDissipation: this.pressureDissipation,
      })
    )
    this._clearPressureWrite = mk(
      clearPressure({
        readTex: this._pressure.write.texture,
        pressureDissipation: this.pressureDissipation,
      })
    )

    this._pressureRead = mk(
      pressure({
        tDivergence: this._divergence.texture,
        readTex: this._pressure.read.texture,
        size: this.simRes,
        neighborStride: this.neighborStride,
        pressureFactor: this.pressureFactor,
      })
    )
    this._pressureWrite = mk(
      pressure({
        tDivergence: this._divergence.texture,
        readTex: this._pressure.write.texture,
        size: this.simRes,
        neighborStride: this.neighborStride,
        pressureFactor: this.pressureFactor,
      })
    )

    this._gradientRead = mk(
      gradient({
        tPressure: this._pressure.read.texture,
        readTex: vel.read.texture,
        size: this.simRes,
        neighborStride: this.neighborStride,
      })
    )
    this._gradientWrite = mk(
      gradient({
        tPressure: this._pressure.read.texture,
        readTex: vel.write.texture,
        size: this.simRes,
        neighborStride: this.neighborStride,
      })
    )

    this._advectVelocityRead = mk(
      advectVelocity({
        readTex: vel.read.texture,
        size: this.simRes,
        deltaTime: this.deltaTime,
        advectionDissipation: this._advectionDissipation,
      })
    )
    this._advectVelocityWrite = mk(
      advectVelocity({
        readTex: vel.write.texture,
        size: this.simRes,
        deltaTime: this.deltaTime,
        advectionDissipation: this._advectionDissipation,
      })
    )

    this._advectDensityRead = mk(
      advectDensity({
        tVelocity: vel.read.texture,
        readTex: den.read.texture,
        simRes: this.simRes,
        deltaTime: this.deltaTime,
        advectionDissipation: this._advectionDissipation,
      })
    )
    this._advectDensityWrite = mk(
      advectDensity({
        tVelocity: vel.read.texture,
        readTex: den.write.texture,
        simRes: this.simRes,
        deltaTime: this.deltaTime,
        advectionDissipation: this._advectionDissipation,
      })
    )

    this._materialsBuilt = true
    this._builtSimRes = this._velocity.width
    this._builtDyeRes = this._density.width
    this._builtUseBoundaries = this._useBoundaries
  }

  _getQuad() {
    this._useQuadA = !this._useQuadA
    return this._useQuadA ? this._quadA : this._quadB
  }

  _renderPass(renderer, material, target) {
    const quad = this._getQuad()
    quad.material = material
    renderer.setRenderTarget(target)
    quad.render(renderer)
  }

  setup() {
    if (!this._materialsBuilt) this._buildMaterials()
    return this._textureNode
  }

  splat(renderer) {
    for (let i = this.splats.length - 1; i >= 0; i--) {
      const { x, y, dx, dy } = this.splats.splice(i, 1)[0]
      this.point.value.set(x, y)
      this.force.value.set(dx, dy)

      const vel = this._velocity
      this._renderPass(
        renderer,
        vel.phase ? this._splatVelocityRead : this._splatVelocityWrite,
        vel.phase ? vel.write : vel.read
      )
      vel.swap()

      const den = this._density
      this._renderPass(
        renderer,
        den.phase ? this._splatDensityRead : this._splatDensityWrite,
        den.phase ? den.write : den.read
      )
      den.swap()
    }
  }

  curl(renderer) {
    const vel = this._velocity
    this._renderPass(
      renderer,
      vel.phase ? this._curlRead : this._curlWrite,
      this._curl.rt
    )
  }

  vorticity(renderer) {
    const vel = this._velocity
    this._renderPass(
      renderer,
      vel.phase ? this._vorticityRead : this._vorticityWrite,
      vel.phase ? vel.write : vel.read
    )
    vel.swap()
  }

  divergence(renderer) {
    const vel = this._velocity
    this._renderPass(
      renderer,
      vel.phase ? this._divergenceRead : this._divergenceWrite,
      this._divergence.rt
    )
  }

  clearPressure(renderer) {
    const p = this._pressure
    this._renderPass(
      renderer,
      p.phase ? this._clearPressureRead : this._clearPressureWrite,
      p.phase ? p.write : p.read
    )
    p.swap()
  }

  pressure(renderer) {
    for (let i = 0; i < this.iterations; i++) {
      const p = this._pressure
      this._renderPass(
        renderer,
        p.phase ? this._pressureRead : this._pressureWrite,
        p.phase ? p.write : p.read
      )
      p.swap()
    }
  }

  gradientSubtract(renderer) {
    const vel = this._velocity
    this._renderPass(
      renderer,
      vel.phase ? this._gradientRead : this._gradientWrite,
      vel.phase ? vel.write : vel.read
    )
    vel.swap()
  }

  advectionVelocity(renderer) {
    this._advectionDissipation.value = this.velocityDissipation
    const vel = this._velocity
    this._renderPass(
      renderer,
      vel.phase ? this._advectVelocityRead : this._advectVelocityWrite,
      vel.phase ? vel.write : vel.read
    )
    vel.swap()
  }

  advectionDensity(renderer) {
    this._advectionDissipation.value = this.densityDissipation
    const den = this._density
    this._renderPass(
      renderer,
      den.phase ? this._advectDensityRead : this._advectDensityWrite,
      den.phase ? den.write : den.read
    )
    den.swap()
  }

  updateBefore({ renderer, deltaTime }) {
    if (this._resizePending) {
      const sim = Math.max(1, Math.round(this._pendingSimRes))
      const dye = Math.max(1, Math.round(this._pendingDyeRes))
      if (
        sim !== this._builtSimRes ||
        dye !== this._builtDyeRes ||
        this._useBoundaries !== this._builtUseBoundaries
      ) {
        this.simRes.value.set(sim, sim)
        this.dyeRes.value.set(dye, dye)
        this._density.setSize(dye, dye)
        this._velocity.setSize(sim, sim)
        this._pressure.setSize(sim, sim)
        this._divergence.setSize(sim, sim)
        this._curl.setSize(sim, sim)
        this._disposeMaterials()
        this._buildMaterials()
        this._resized = true
      }
      this._resizePending = false
    }

    if (typeof deltaTime === 'number') {
      this.deltaTime.value = Math.min(deltaTime, 0.1)
    }

    const ptr = this.pointer.value
    if (ptr) {
      if (this._hasPrevPointer) {
        let dx = ptr.x - this._prevPointer.x
        let dy = ptr.y - this._prevPointer.y
        const lim = 0.1
        dx = Math.max(-lim, Math.min(lim, dx))
        dy = Math.max(-lim, Math.min(lim, dy))

        if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
          const nx = ptr.x * 0.5 + 0.5
          const ny = ptr.y * -0.5 + 0.5
          if (nx < 0.05 || nx > 0.95 || ny < 0.05 || ny > 0.95) {
            this._prevPointer.set(ptr.x, ptr.y)
            return
          }
          renderer.getSize(this._rendererSize)
          const minDim = Math.max(
            1,
            Math.min(this._rendererSize.x, this._rendererSize.y)
          )
          const fx = dx * minDim * 0.5 * this._pointerScale
          const fy = -dy * minDim * 0.5 * this._pointerScale
          this.splats.push({ x: nx, y: ny, dx: fx, dy: fy })
        }
      }
      this._prevPointer.set(ptr.x, ptr.y)
      this._hasPrevPointer = true
    }

    _savedRendererState = RendererUtils.resetRendererState(
      renderer,
      _savedRendererState
    )
    renderer.autoClear = false

    if (this._resized) {
      this._resized = false
      RendererUtils.restoreRendererState(renderer, _savedRendererState)
      return
    }

    this._accumulatedTime += this.deltaTime.value
    const steps = Math.floor(
      this._accumulatedTime / (this._timeStep * this._speedFactor)
    )

    if (steps > 0) {
      this._accumulatedTime -= steps * this._timeStep * this._speedFactor
      for (let s = 0; s < steps; s++) {
        this.deltaTime.value = this._timeStep * this._speedFactor
        const savedSplats = [...this.splats]
        this.splats.length = 0
        if (s === 0) this.splats.push(...savedSplats)
        this.splat(renderer)
        this.curl(renderer)
        this.vorticity(renderer)
        this.divergence(renderer)
        this.clearPressure(renderer)
        this.pressure(renderer)
        this.gradientSubtract(renderer)
        this.advectionVelocity(renderer)
        this.advectionDensity(renderer)
      }
    }

    this._textureNode.value = this._density.phase
      ? this._density.read.texture
      : this._density.write.texture

    renderer.setRenderTarget(null)
    RendererUtils.restoreRendererState(renderer, _savedRendererState)
  }

  _disposeMaterials() {
    const keys = [
      '_splatVelocityRead',
      '_splatVelocityWrite',
      '_splatDensityRead',
      '_splatDensityWrite',
      '_curlRead',
      '_curlWrite',
      '_vorticityRead',
      '_vorticityWrite',
      '_divergenceRead',
      '_divergenceWrite',
      '_clearPressureRead',
      '_clearPressureWrite',
      '_pressureRead',
      '_pressureWrite',
      '_gradientRead',
      '_gradientWrite',
      '_advectVelocityRead',
      '_advectVelocityWrite',
      '_advectDensityRead',
      '_advectDensityWrite',
    ]
    for (const k of keys) {
      if (this[k]) {
        this[k].dispose()
        this[k] = null
      }
    }
  }

  dispose() {
    this._density.dispose()
    this._velocity.dispose()
    this._pressure.dispose()
    this._divergence.dispose()
    this._curl.dispose()
    this._disposeMaterials()
    this._quadA.dispose()
    this._quadB.dispose()
  }
}

// ─── Factory helper ───────────────────────────────────────────────────────────

export function smokeNode(
  pointer,
  simRes = 4,
  dyeRes = 4,
  iterations = 3,
  densityDissipation = 0.97,
  velocityDissipation = 0.98,
  pressureDissipation = 0.8,
  curlStrength = 20,
  pressureFactor = 0.2,
  radius = 0.1,
  useBoundaries = true,
  pointerScale = 45,
  neighborStride = 1,
  speedFactor = 1
) {
  return nodeObject(
    new SmokeNodeRTT({
      pointer,
      simRes,
      dyeRes,
      iterations,
      densityDissipation,
      velocityDissipation,
      pressureDissipation,
      curlStrength,
      pressureFactor,
      radius,
      useBoundaries,
      pointerScale,
      neighborStride,
      speedFactor,
    })
  )
}
