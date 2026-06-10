let regionLoadSeq = 0;

export function createLoadContext() {
  const loadId = ++regionLoadSeq;
  return {
    loadId,
    isStale: () => loadId !== regionLoadSeq,
  };
}
