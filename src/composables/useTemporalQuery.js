import { ref } from 'vue';
import { ElMessage } from 'element-plus';

/**
 * 封装带时间维度的 API 查询，统一处理 isStale 提示。
 */
export function useTemporalQuery(fetcher, options = {}) {
  const loading = ref(false);
  const error = ref(null);
  const data = ref(null);
  const stale = ref(false);
  const empty = ref(false);

  async function execute(...args) {
    loading.value = true;
    error.value = null;
    stale.value = false;
    empty.value = false;
    try {
      const result = await fetcher(...args);
      data.value = result;
      const isStale = Boolean(result?.isStale ?? result?.meta?.isStale);
      stale.value = isStale;
      if (isStale && options.warnStale !== false) {
        ElMessage.warning(options.staleMessage || '数据非最新');
      }
      empty.value = Array.isArray(result)
        ? result.length === 0
        : result == null || (typeof result === 'object' && Object.keys(result).length === 0);
      return result;
    } catch (err) {
      error.value = err;
      data.value = null;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    error,
    data,
    stale,
    empty,
    execute,
    refresh: execute,
  };
}
