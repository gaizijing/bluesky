import * as Cesium from 'cesium'
import SkyBoxOnGround from './skybox_nearground.js'

export class SkyBoxManager {
  constructor(viewer, options = {}) {
    this.viewer = viewer
    this.nearGroundSkyBox = null
    this.defaultSkyBox = null
    this.currentSkyBox = null
    this.preUpdateListener = null
    this.cameraHeightThreshold = options.cameraHeightThreshold || 240000
    this.skyBoxConfig = options.skyBoxConfig || this.getDefaultSkyBoxConfig()
    
    this.init()
  }

  getDefaultSkyBoxConfig() {
    return {
      positiveX: '/texture/qingtian/rightav9.jpg',
      negativeX: '/texture/qingtian/leftav9.jpg',
      positiveY: '/texture/qingtian/frontav9.jpg',
      negativeY: '/texture/qingtian/backav9.jpg',
      positiveZ: '/texture/qingtian/topav9.jpg',
      negativeZ: '/texture/qingtian/bottomav9.jpg'
    }
  }

  init() {
    this.defaultSkyBox = this.viewer.scene.skyBox
    this.nearGroundSkyBox = new SkyBoxOnGround({
      sources: this.skyBoxConfig
    })
    this.currentSkyBox = this.nearGroundSkyBox
    
    this.setupCameraHeightListener()
  }

  setupCameraHeightListener() {
    this.preUpdateListener = this.viewer.scene.preUpdate.addEventListener(() => {
      const cameraHeight = this.getCameraHeight()
      this.updateSkyBox(cameraHeight)
    })
  }

  getCameraHeight() {
    const position = this.viewer.scene.camera.position
    return Cesium.Cartographic.fromCartesian(position).height
  }

  updateSkyBox(cameraHeight) {
    if (cameraHeight < this.cameraHeightThreshold) {
      this.viewer.scene.skyBox = this.currentSkyBox
      this.viewer.scene.skyAtmosphere.show = false
    } else {
      this.viewer.scene.skyBox = this.defaultSkyBox
      this.viewer.scene.skyAtmosphere.show = true
    }
  }

  setNearGroundSkyBox(skyBoxConfig) {
    this.nearGroundSkyBox = new SkyBoxOnGround({
      sources: skyBoxConfig
    })
    this.currentSkyBox = this.nearGroundSkyBox
  }

  setCameraHeightThreshold(threshold) {
    this.cameraHeightThreshold = threshold
  }

  destroy() {
    if (this.preUpdateListener) {
      this.viewer.scene.preUpdate.removeEventListener(this.preUpdateListener)
      this.preUpdateListener = null
    }
    this.nearGroundSkyBox = null
    this.defaultSkyBox = null
    this.currentSkyBox = null
  }
}
