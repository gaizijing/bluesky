/**
 * Marching Cubes — ESM wrapper (tables from mikolalysenko/isosurface, MIT)
 */
import { marchingCubes } from './marchingCubes.source.js'

/**
 * @param {Float32Array} field - x fastest: idx = x + nx*y + nx*ny*z
 * @param {[number,number,number]} dims - grid point counts [nx, ny, nz]
 * @param {number} isovalue
 */
export function extractIsosurfaceFromGrid(field, dims, isovalue) {
  const [nx, ny, nz] = dims
  const bounds = [[0, 0, 0], [1, 1, 1]]

  const sample = (x, y, z) => {
    const fx = x * (nx - 1)
    const fy = y * (ny - 1)
    const fz = z * (nz - 1)
    return trilinearSample(field, nx, ny, nz, fx, fy, fz) - isovalue
  }

  const { positions, cells } = marchingCubes(dims, sample, bounds)
  const indices = []
  for (const tri of cells) {
    indices.push(tri[0], tri[1], tri[2])
  }
  return { positions, indices, triangleCount: cells.length }
}

function trilinearSample(field, nx, ny, nz, fx, fy, fz) {
  const x0 = Math.max(0, Math.min(nx - 2, Math.floor(fx)))
  const y0 = Math.max(0, Math.min(ny - 2, Math.floor(fy)))
  const z0 = Math.max(0, Math.min(nz - 2, Math.floor(fz)))
  const tx = fx - x0
  const ty = fy - y0
  const tz = fz - z0

  const at = (x, y, z) => field[x + nx * (y + ny * z)]

  const c000 = at(x0, y0, z0)
  const c100 = at(x0 + 1, y0, z0)
  const c010 = at(x0, y0 + 1, z0)
  const c110 = at(x0 + 1, y0 + 1, z0)
  const c001 = at(x0, y0, z0 + 1)
  const c101 = at(x0 + 1, y0, z0 + 1)
  const c011 = at(x0, y0 + 1, z0 + 1)
  const c111 = at(x0 + 1, y0 + 1, z0 + 1)

  const c00 = c000 * (1 - tx) + c100 * tx
  const c01 = c001 * (1 - tx) + c101 * tx
  const c10 = c010 * (1 - tx) + c110 * tx
  const c11 = c011 * (1 - tx) + c111 * tx
  const c0 = c00 * (1 - ty) + c10 * ty
  const c1 = c01 * (1 - ty) + c11 * ty
  return c0 * (1 - tz) + c1 * tz
}

/**
 * Fill grid from a world-space sampler returning R_met in [0,1].
 */
export function fillChunkGrid(sampler, dims, chunkBounds) {
  const [nx, ny, nz] = dims
  const field = new Float32Array(nx * ny * nz)
  const { west, south, east, north, minHeight, maxHeight } = chunkBounds

  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const u = nx > 1 ? x / (nx - 1) : 0
        const v = ny > 1 ? y / (ny - 1) : 0
        const w = nz > 1 ? z / (nz - 1) : 0
        const lon = west + u * (east - west)
        const lat = south + v * (north - south)
        const height = minHeight + w * (maxHeight - minHeight)
        field[x + nx * (y + ny * z)] = sampler(lon, lat, height)
      }
    }
  }
  return field
}

export { marchingCubes }
