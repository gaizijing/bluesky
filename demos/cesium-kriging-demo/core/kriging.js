/**
 * Kriging 空间插值（改编自 @sakitam-gis/kriging.js）
 * https://github.com/sakitam-gis/kriging.js
 */

function max(arr) {
  return Math.max.apply(null, arr)
}

function min(arr) {
  return Math.min.apply(null, arr)
}

function rep(value, n) {
  return Array.from({ length: n }, () => value)
}

function pip(ring, x, y) {
  let c = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    if (
      (ring[i][1] > y) !== (ring[j][1] > y) &&
      x < ((ring[j][0] - ring[i][0]) * (y - ring[i][1])) / (ring[j][1] - ring[i][1]) + ring[i][0]
    ) {
      c = !c
    }
  }
  return c
}

function matrixDiag(c, n) {
  const Z = rep(0, n * n)
  for (let i = 0; i < n; i++) Z[i * n + i] = c
  return Z
}

function matrixTranspose(X, n, m) {
  const Z = Array(m * n)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      Z[j * n + i] = X[i * m + j]
    }
  }
  return Z
}

function matrixAdd(X, Y, n, m) {
  const Z = Array(n * m)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      Z[i * m + j] = X[i * m + j] + Y[i * m + j]
    }
  }
  return Z
}

function matrixMultiply(X, Y, n, m, p) {
  const Z = Array(n * p)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      Z[i * p + j] = 0
      for (let k = 0; k < m; k++) {
        Z[i * p + j] += X[i * m + k] * Y[k * p + j]
      }
    }
  }
  return Z
}

function matrixChol(X, n) {
  const p = Array(n)
  for (let i = 0; i < n; i++) p[i] = X[i * n + i]
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < i; j++) p[i] -= X[i * n + j] * X[i * n + j]
    if (p[i] <= 0) return false
    p[i] = Math.sqrt(p[i])
    for (let j = i + 1; j < n; j++) {
      for (let k = 0; k < i; k++) X[j * n + i] -= X[j * n + k] * X[i * n + k]
      X[j * n + i] /= p[i]
    }
  }
  for (let i = 0; i < n; i++) X[i * n + i] = p[i]
  return true
}

function matrixChol2inv(X, n) {
  for (let i = 0; i < n; i++) {
    X[i * n + i] = 1 / X[i * n + i]
    for (let j = i + 1; j < n; j++) {
      let sum = 0
      for (let k = i; k < j; k++) sum -= X[j * n + k] * X[k * n + i]
      X[j * n + i] = sum / X[j * n + j]
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) X[i * n + j] = 0
  }
  for (let i = 0; i < n; i++) {
    X[i * n + i] *= X[i * n + i]
    for (let k = i + 1; k < n; k++) X[i * n + i] += X[k * n + i] * X[k * n + i]
    for (let j = i + 1; j < n; j++) {
      for (let k = j; k < n; k++) X[i * n + j] += X[k * n + i] * X[k * n + j]
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < i; j++) X[i * n + j] = X[j * n + i]
  }
}

function matrixSolve(X, n) {
  const m = n
  const b = Array(n * n)
  const indxc = Array(n)
  const indxr = Array(n)
  const ipiv = Array(n)

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      b[i * n + j] = i === j ? 1 : 0
    }
  }
  for (let j = 0; j < n; j++) ipiv[j] = 0

  for (let i = 0; i < n; i++) {
    let big = 0
    let icol = 0
    let irow = 0
    for (let j = 0; j < n; j++) {
      if (ipiv[j] !== 1) {
        for (let k = 0; k < n; k++) {
          if (ipiv[k] === 0 && Math.abs(X[j * n + k]) >= big) {
            big = Math.abs(X[j * n + k])
            irow = j
            icol = k
          }
        }
      }
    }
    ++ipiv[icol]
    if (irow !== icol) {
      for (let l = 0; l < n; l++) {
        const temp = X[irow * n + l]
        X[irow * n + l] = X[icol * n + l]
        X[icol * n + l] = temp
      }
      for (let l = 0; l < m; l++) {
        const temp = b[irow * n + l]
        b[irow * n + l] = b[icol * n + l]
        b[icol * n + l] = temp
      }
    }
    indxr[i] = irow
    indxc[i] = icol
    if (X[icol * n + icol] === 0) return false
    const pivinv = 1 / X[icol * n + icol]
    X[icol * n + icol] = 1
    for (let l = 0; l < n; l++) X[icol * n + l] *= pivinv
    for (let l = 0; l < m; l++) b[icol * n + l] *= pivinv
    for (let ll = 0; ll < n; ll++) {
      if (ll !== icol) {
        const dum = X[ll * n + icol]
        X[ll * n + icol] = 0
        for (let l = 0; l < n; l++) X[ll * n + l] -= X[icol * n + l] * dum
        for (let l = 0; l < m; l++) b[ll * n + l] -= b[icol * n + l] * dum
      }
    }
  }
  for (let l = n - 1; l >= 0; l--) {
    if (indxr[l] !== indxc[l]) {
      for (let k = 0; k < n; k++) {
        const temp = X[k * n + indxr[l]]
        X[k * n + indxr[l]] = X[k * n + indxc[l]]
        X[k * n + indxc[l]] = temp
      }
    }
  }
  return true
}

function variogramGaussian(h, nugget, range, sill, A) {
  return nugget + ((sill - nugget) / range) * (1.0 - Math.exp(-(1.0 / A) * Math.pow(h / range, 2)))
}

function variogramExponential(h, nugget, range, sill, A) {
  return nugget + ((sill - nugget) / range) * (1.0 - Math.exp(-(1.0 / A) * (h / range)))
}

function variogramSpherical(h, nugget, range, sill) {
  if (h > range) return nugget + (sill - nugget) / range
  return nugget + ((sill - nugget) / range) * (1.5 * (h / range) - 0.5 * Math.pow(h / range, 3))
}

function train(t, x, y, model, sigma2, alpha) {
  const variogram = {
    t,
    x,
    y,
    nugget: 0.0,
    range: 0.0,
    sill: 0.0,
    A: 1 / 3,
    n: 0,
    model: variogramExponential,
    K: [],
    M: [],
  }

  switch (model) {
    case 'gaussian':
      variogram.model = variogramGaussian
      break
    case 'spherical':
      variogram.model = variogramSpherical
      break
    default:
      variogram.model = variogramExponential
  }

  const n0 = t.length
  const distance = Array((n0 * n0 - n0) / 2)
  for (let i = 0, k = 0; i < n0; i++) {
    for (let j = 0; j < i; j++, k++) {
      distance[k] = [
        Math.pow(Math.pow(x[i] - x[j], 2) + Math.pow(y[i] - y[j], 2), 0.5),
        Math.abs(t[i] - t[j]),
      ]
    }
  }
  distance.sort((a, b) => a[0] - b[0])
  variogram.range = distance[(n0 * n0 - n0) / 2 - 1][0]

  const lags = (n0 * n0 - n0) / 2 > 30 ? 30 : (n0 * n0 - n0) / 2
  const tolerance = variogram.range / lags
  const lag = rep(0, lags)
  const semi = rep(0, lags)
  let l = 0

  if (lags < 30) {
    for (l = 0; l < lags; l++) {
      lag[l] = distance[l][0]
      semi[l] = distance[l][1]
    }
  } else {
    l = 0
    for (let i = 0, j = 0, k = 0; i < lags && j < (n0 * n0 - n0) / 2; i++, k = 0) {
      while (distance[j][0] <= (i + 1) * tolerance) {
        lag[l] += distance[j][0]
        semi[l] += distance[j][1]
        j++
        k++
        if (j >= (n0 * n0 - n0) / 2) break
      }
      if (k > 0) {
        lag[l] /= k
        semi[l] /= k
        l++
      }
    }
    if (l < 2) return variogram
  }

  let n = l
  variogram.range = lag[n - 1] - lag[0]
  const X = rep(1, 2 * n)
  const Y = Array(n)
  const A = variogram.A
  for (let i = 0; i < n; i++) {
    switch (model) {
      case 'gaussian':
        X[i * 2 + 1] = 1.0 - Math.exp(-(1.0 / A) * Math.pow(lag[i] / variogram.range, 2))
        break
      case 'spherical':
        X[i * 2 + 1] = 1.5 * (lag[i] / variogram.range) - 0.5 * Math.pow(lag[i] / variogram.range, 3)
        break
      default:
        X[i * 2 + 1] = 1.0 - Math.exp(-(1.0 / A) * (lag[i] / variogram.range))
    }
    Y[i] = semi[i]
  }

  const Xt = matrixTranspose(X, n, 2)
  let Z = matrixMultiply(Xt, X, 2, n, 2)
  Z = matrixAdd(Z, matrixDiag(1 / alpha, 2), 2, 2)
  const cloneZ = Z.slice(0)
  if (matrixChol(Z, 2)) matrixChol2inv(Z, 2)
  else {
    matrixSolve(cloneZ, 2)
    Z = cloneZ
  }
  const W = matrixMultiply(matrixMultiply(Z, Xt, 2, 2, n), Y, 2, n, 1)
  variogram.nugget = W[0]
  variogram.sill = W[1] * variogram.range + variogram.nugget
  variogram.n = x.length

  n = x.length
  const K = Array(n * n)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < i; j++) {
      K[i * n + j] = variogram.model(
        Math.pow(Math.pow(x[i] - x[j], 2) + Math.pow(y[i] - y[j], 2), 0.5),
        variogram.nugget,
        variogram.range,
        variogram.sill,
        variogram.A
      )
      K[j * n + i] = K[i * n + j]
    }
    K[i * n + i] = variogram.model(0, variogram.nugget, variogram.range, variogram.sill, variogram.A)
  }

  let C = matrixAdd(K, matrixDiag(sigma2, n), n, n)
  const cloneC = C.slice(0)
  if (matrixChol(C, n)) matrixChol2inv(C, n)
  else {
    matrixSolve(cloneC, n)
    C = cloneC
  }

  variogram.K = C.slice(0)
  variogram.M = matrixMultiply(C, t, n, n, 1)
  return variogram
}

function predict(x, y, variogram) {
  const k = Array(variogram.n)
  for (let i = 0; i < variogram.n; i++) {
    k[i] = variogram.model(
      Math.pow(Math.pow(x - variogram.x[i], 2) + Math.pow(y - variogram.y[i], 2), 0.5),
      variogram.nugget,
      variogram.range,
      variogram.sill,
      variogram.A
    )
  }
  return matrixMultiply(k, variogram.M, 1, variogram.n, 1)[0]
}

function grid(polygons, variogram, width) {
  const n = polygons.length
  if (n === 0) return null

  const xlim = [polygons[0][0][0], polygons[0][0][0]]
  const ylim = [polygons[0][0][1], polygons[0][0][1]]
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < polygons[i].length; j++) {
      xlim[0] = Math.min(xlim[0], polygons[i][j][0])
      xlim[1] = Math.max(xlim[1], polygons[i][j][0])
      ylim[0] = Math.min(ylim[0], polygons[i][j][1])
      ylim[1] = Math.max(ylim[1], polygons[i][j][1])
    }
  }

  const lxlim = Array(2)
  const lylim = Array(2)
  const a = Array(2)
  const b = Array(2)
  const cols = Math.ceil((xlim[1] - xlim[0]) / width)
  const rows = Math.ceil((ylim[1] - ylim[0]) / width)
  const A = Array(cols + 1)
  for (let i = 0; i <= cols; i++) A[i] = Array(rows + 1)

  for (let i = 0; i < n; i++) {
    lxlim[0] = polygons[i][0][0]
    lxlim[1] = lxlim[0]
    lylim[0] = polygons[i][0][1]
    lylim[1] = lylim[0]
    for (let j = 1; j < polygons[i].length; j++) {
      lxlim[0] = Math.min(lxlim[0], polygons[i][j][0])
      lxlim[1] = Math.max(lxlim[1], polygons[i][j][0])
      lylim[0] = Math.min(lylim[0], polygons[i][j][1])
      lylim[1] = Math.max(lylim[1], polygons[i][j][1])
    }

    a[0] = Math.floor((lxlim[0] - ((lxlim[0] - xlim[0]) % width) - xlim[0]) / width)
    a[1] = Math.ceil((lxlim[1] - ((lxlim[1] - xlim[1]) % width) - xlim[0]) / width)
    b[0] = Math.floor((lylim[0] - ((lylim[0] - ylim[0]) % width) - ylim[0]) / width)
    b[1] = Math.ceil((lylim[1] - ((lylim[1] - ylim[1]) % width) - ylim[0]) / width)

    for (let j = a[0]; j <= a[1]; j++) {
      for (let k = b[0]; k <= b[1]; k++) {
        const xtarget = xlim[0] + j * width
        const ytarget = ylim[0] + k * width
        if (pip(polygons[i], xtarget, ytarget)) {
          A[j][k] = predict(xtarget, ytarget, variogram)
        }
      }
    }
  }

  return {
    data: A,
    xlim,
    ylim,
    zlim: [min(tFromVariogram(variogram)), max(tFromVariogram(variogram))],
    width,
  }
}

function tFromVariogram(variogram) {
  return variogram.t
}

function plot(canvas, gridData, xlim, ylim, colors) {
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const data = gridData.data
  const zlim = gridData.zlim
  const width = gridData.width
  const range = [xlim[1] - xlim[0], ylim[1] - ylim[0], zlim[1] - zlim[0]]
  const n = data.length
  const m = data[0].length
  const wx = Math.ceil((width * canvas.width) / (xlim[1] - xlim[0]))
  const wy = Math.ceil((width * canvas.height) / (ylim[1] - ylim[0]))

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (data[i][j] === undefined) continue
      const x = (canvas.width * (i * width + gridData.xlim[0] - xlim[0])) / range[0]
      const y = canvas.height * (1 - (j * width + gridData.ylim[0] - ylim[0]) / range[1])
      let z = (data[i][j] - zlim[0]) / range[2]
      z = Math.max(0, Math.min(1, z))
      ctx.fillStyle = colors[Math.floor((colors.length - 1) * z)]
      ctx.fillRect(Math.round(x - wx / 2), Math.round(y - wy / 2), wx, wy)
    }
  }
}

const kriging = { train, predict, grid, plot }

export default kriging
