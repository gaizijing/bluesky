<template>
    <vc-viewer></vc-viewer>
</template>
<script setup>
  import { reactive } from 'vue'
  import { VcConfigProvider, VcViewer } from 'vue-cesium'

  const vcConfig = reactive({
    cesiumPath: 'https://unpkg.com/cesium@latest/Build/Cesium/Cesium.js'
  })
</script>