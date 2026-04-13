const LIST_KEYS = ['list', 'records', 'items', 'rows', 'content', 'result']
const OBJECT_KEYS = ['item', 'record', 'detail', 'result']

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === '[object Object]'

export const extractList = (payload) => {
  if (Array.isArray(payload)) {
    return payload
  }

  if (!isPlainObject(payload)) {
    return []
  }

  if (Array.isArray(payload.data)) {
    return payload.data
  }

  for (const key of LIST_KEYS) {
    if (Array.isArray(payload[key])) {
      return payload[key]
    }

    if (isPlainObject(payload.data) && Array.isArray(payload.data[key])) {
      return payload.data[key]
    }
  }

  return []
}

export const extractRecord = (payload) => {
  if (Array.isArray(payload)) {
    return payload[0] ?? null
  }

  if (!isPlainObject(payload)) {
    return null
  }

  if (isPlainObject(payload.data)) {
    return payload.data
  }

  for (const key of OBJECT_KEYS) {
    if (isPlainObject(payload[key])) {
      return payload[key]
    }

    if (isPlainObject(payload.data) && isPlainObject(payload.data[key])) {
      return payload.data[key]
    }
  }

  return payload
}

export const normalizeNumber = (value, fallback = 0) => {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : fallback
}

export const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value === 1
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()

    if (['true', '1', 'active', 'enabled', 'enable', 'yes', '启用', '在线', '活跃'].includes(normalized)) {
      return true
    }

    if (['false', '0', 'inactive', 'disabled', 'disable', 'no', '禁用', '离线', '停用'].includes(normalized)) {
      return false
    }
  }

  return fallback
}


