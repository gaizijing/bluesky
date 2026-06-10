const DATAV_BASE = 'https://geo.datav.aliyun.com/areas_v3/bound'

function normalizeAdcode(adcode) {
  return String(adcode ?? '').trim()
}

function mapFeatureToNode(feature) {
  const props = feature?.properties || {}
  const adcode = normalizeAdcode(props.adcode)
  const childrenNum = Number(props.childrenNum) || 0
  return {
    adcode,
    name: props.name || adcode,
    center: props.center,
    level: props.level,
    childrenNum,
    leaf: childrenNum === 0,
  }
}

/** 拉取某级下属区划（lazy cascader 用） */
export async function fetchAreaChildren(parentAdcode) {
  const code = normalizeAdcode(parentAdcode) || '100000'
  const res = await fetch(`${DATAV_BASE}/${code}_full.json`)
  if (!res.ok) {
    throw new Error(`区划数据加载失败: ${code}`)
  }
  const geo = await res.json()
  const features = Array.isArray(geo?.features) ? geo.features : []
  return features.map(mapFeatureToNode).filter((item) => item.adcode)
}

/** 单个区划元数据（含 center、acroutes） */
export async function fetchAreaMeta(adcode) {
  const code = normalizeAdcode(adcode)
  if (!code) return null
  const res = await fetch(`${DATAV_BASE}/${code}.json`)
  if (!res.ok) {
    throw new Error(`区划详情加载失败: ${code}`)
  }
  const geo = await res.json()
  const feature = geo?.features?.[0]
  if (!feature) return null
  const node = mapFeatureToNode(feature)
  const acroutes = feature.properties?.acroutes
  return { ...node, acroutes: Array.isArray(acroutes) ? acroutes : [] }
}

/** 由 adcode 反推 el-cascader 路径 [省, 市, 区…] */
export async function resolveAreaCascaderPath(adcode) {
  const code = normalizeAdcode(adcode)
  if (!code) return []
  const meta = await fetchAreaMeta(code)
  if (!meta) return [code]

  const ancestors = (meta.acroutes || [])
    .map((item) => normalizeAdcode(item))
    .filter((item) => item && item !== '100000')

  const path = [...ancestors]
  if (!path.length || path[path.length - 1] !== code) {
    path.push(code)
  }
  return path
}

/** Element Plus Cascader lazyLoad */
export async function lazyLoadAreaCascader(node, resolve) {
  try {
    const parentAdcode = node.level === 0 ? '100000' : node.value
    const children = await fetchAreaChildren(parentAdcode)
    resolve(
      children.map((item) => ({
        value: item.adcode,
        label: item.name,
        leaf: item.leaf,
      })),
    )
  } catch (err) {
    console.warn('[chinaAreaCascader] lazyLoad failed', err)
    resolve([])
  }
}

export const areaCascaderProps = {
  lazy: true,
  lazyLoad: lazyLoadAreaCascader,
  emitPath: true,
  checkStrictly: true,
  value: 'value',
  label: 'label',
  leaf: 'leaf',
}
