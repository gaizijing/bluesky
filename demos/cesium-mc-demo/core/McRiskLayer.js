import * as Cesium from 'cesium'
import { extractIsosurfaceFromGrid, fillChunkGrid } from './marchingCubes.js'
import { createRMetSampler } from './fakeRMetVolume.js'
import { createChunkGrid, getVisibleChunks } from './spatialChunks.js'

const RISK_COLOR = Cesium.Color.fromBytes(255, 72, 48, 110)

/**
 * RenderLayer-style MC risk layer for Phase 0 validation.
 * initialize → update → destroy
 */
export class McRiskLayer {
  constructor() {
    this.viewer = null
    this.volume = null
    this.chunks = []
    this.chunkRecords = new Map()
    this.timeIndex = 0
    this.isovalue = 0.42
    this.enableCulling = true
    this.divisions = 4
    this._destroyed = false
    this.stats = {
      visibleChunks: 0,
      activePrimitives: 0,
      vertexCount: 0,
      triangleCount: 0,
      lastUpdateMs: 0
    }
  }

  initialize(viewer, options = {}) {
    this.destroy()
    this._destroyed = false
    this.viewer = viewer
    this.volume = options.volume
    this.isovalue = options.isovalue ?? 0.42
    this.enableCulling = options.enableCulling ?? true
    this.divisions = options.divisions ?? 4
    this.timeIndex = options.timeIndex ?? 0
    this.chunks = createChunkGrid(this.volume, this.divisions)
    return this.update({ timeIndex: this.timeIndex, reason: 'initialize' })
  }

  setIsovalue(value) {
    this.isovalue = value
    return this.update({ timeIndex: this.timeIndex, reason: 'isovalue' })
  }

  setEnableCulling(enabled) {
    this.enableCulling = enabled
    return this.update({ timeIndex: this.timeIndex, reason: 'culling' })
  }

  update({ timeIndex = this.timeIndex, reason = 'time' } = {}) {
    if (this._destroyed || !this.viewer) return this.stats

    const t0 = performance.now()
    this.timeIndex = timeIndex
    const sampler = createRMetSampler(timeIndex)
    const visible = getVisibleChunks(this.viewer, this.chunks, this.enableCulling)
    const visibleIds = new Set(visible.map((c) => c.id))

    // Remove chunks no longer visible
    for (const [id, record] of this.chunkRecords) {
      if (!visibleIds.has(id)) {
        this._removeChunkPrimitive(id, record)
      }
    }

    let vertexCount = 0
    let triangleCount = 0

    for (const chunk of visible) {
      const mesh = this._buildChunkMesh(chunk, sampler)
      vertexCount += mesh.vertexCount
      triangleCount += mesh.triangleCount
      this._upsertChunkPrimitive(chunk.id, mesh)
    }

    this.stats = {
      visibleChunks: visible.length,
      activePrimitives: this.chunkRecords.size,
      vertexCount,
      triangleCount,
      lastUpdateMs: Math.round(performance.now() - t0),
      reason
    }

    this.viewer.scene.requestRender()
    return this.stats
  }

  _buildChunkMesh(chunk, sampler) {
    const dims = chunk.gridDims
    const field = fillChunkGrid(sampler, dims, chunk.bounds)
    const { positions, indices, triangleCount } = extractIsosurfaceFromGrid(field, dims, this.isovalue)

    if (!positions.length) {
      return { positions: [], indices: new Uint32Array(0), vertexCount: 0, triangleCount: 0 }
    }

    const cartesian = new Array(positions.length)
    const { west, south, east, north, minHeight, maxHeight } = chunk.bounds

    for (let i = 0; i < positions.length; i++) {
      const p = positions[i]
      const lon = west + p[0] * (east - west)
      const lat = south + p[1] * (north - south)
      const height = minHeight + p[2] * (maxHeight - minHeight)
      cartesian[i] = Cesium.Cartesian3.fromDegrees(lon, lat, height)
    }

    return {
      positions: cartesian,
      indices: new Uint32Array(indices),
      vertexCount: cartesian.length,
      triangleCount
    }
  }

  _upsertChunkPrimitive(chunkId, mesh) {
    const existing = this.chunkRecords.get(chunkId)
    if (existing) {
      this.viewer.scene.primitives.remove(existing.primitive)
      existing.primitive = null
    }

    if (!mesh.vertexCount) {
      if (existing) this.chunkRecords.delete(chunkId)
      return
    }

    const geometry = new Cesium.Geometry({
      attributes: {
        position: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.DOUBLE,
          componentsPerAttribute: 3,
          values: Cesium.Cartesian3.packArray(mesh.positions, [])
        })
      },
      indices: mesh.indices,
      primitiveType: Cesium.PrimitiveType.TRIANGLES,
      boundingSphere: Cesium.BoundingSphere.fromPoints(mesh.positions)
    })

    const primitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry,
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(RISK_COLOR)
        },
        id: `mc-chunk-${chunkId}`
      }),
      appearance: new Cesium.PerInstanceColorAppearance({
        closed: false,
        translucent: true,
        flat: true
      }),
      asynchronous: false
    })

    this.viewer.scene.primitives.add(primitive)
    this.chunkRecords.set(chunkId, { primitive, vertexCount: mesh.vertexCount, triangleCount: mesh.triangleCount })
  }

  _removeChunkPrimitive(chunkId, record) {
    if (record?.primitive && this.viewer) {
      this.viewer.scene.primitives.remove(record.primitive)
    }
    this.chunkRecords.delete(chunkId)
  }

  destroy() {
    if (this._destroyed) return
    this._destroyed = true
    for (const [id, record] of this.chunkRecords) {
      this._removeChunkPrimitive(id, record)
    }
    this.chunkRecords.clear()
    this.viewer = null
  }
}
