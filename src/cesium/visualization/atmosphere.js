import * as Cesium from 'cesium'

export default class Atmosphere {
    constructor(viewer) {
        this.viewer = viewer
        this.atmosphereStage = null
    }

    /**
     * 初始化并显示大气散射效果（修复后）
     */
    show() {
        if (!this.viewer || !this.viewer.scene) {
            console.warn('viewer 未初始化完成')
            return
        }

        // 防止重复创建
        if (this.atmosphereStage) {
            return
        }

        const fs = `
uniform sampler2D colorTexture;  // 颜色纹理
uniform sampler2D depthTexture;  // 深度纹理
in vec2 v_textureCoordinates;  // 纹理坐标
uniform float u_earthRadiusOnCamera;
uniform float u_cameraHeight;
uniform float u_fogHeight;
uniform vec3 u_fogColor;
uniform float u_globalDensity;

// 显式声明输出颜色（关键修复：Cesium部分版本必须声明）
out vec4 out_FragColor;

// 通过深度纹理与纹理坐标得到世界坐标
vec4 getWorldCoordinate(sampler2D depthTexture, vec2 texCoords) {
	float depthOrLogDepth = czm_unpackDepth(texture(depthTexture, texCoords));
	vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, depthOrLogDepth);
	eyeCoordinate = eyeCoordinate / eyeCoordinate.w;
	vec4 worldCoordinate = czm_inverseView * eyeCoordinate;
	worldCoordinate = worldCoordinate / worldCoordinate.w;
	return worldCoordinate;
}

// 计算粗略的高程（增加边界判断，避免负数）
float getRoughHeight(vec4 worldCoordinate) {
	float disToCenter = length(vec3(worldCoordinate));
	float height = disToCenter - u_earthRadiusOnCamera;
	return max(height, 0.0); // 确保高程非负，避免无效计算
}

// 得到a向量在b向量的投影长度（增加防除0）
float projectVector(vec3 a, vec3 b) {
	float bDot = dot(b, b);
	if (bDot < 0.0001) { // 防除0
		return 0.0;
	}
	float scale = dot(a, b) / bDot;
	float k = scale / abs(scale + 0.0001); // 防scale为0
	return k * length(scale * b);
}

// 线性浓度积分高度雾（核心修复：防除0、降低雾强度）
float linearHeightFog(vec3 positionToCamera, float cameraHeight, float pixelHeight, float fogMaxHeight) {
	float globalDensity = u_globalDensity / 100.0; // 降低密度（从/10改为/100）
	vec3 up = -1.0 * normalize(czm_viewerPositionWC);
	float vh = projectVector(normalize(positionToCamera), up);

	// 防vh为0（关键修复：避免除以0导致NaN）
	if (abs(vh) < 0.01) {
		vh = 0.01 * sign(vh); // 给极小值，避免除以0
	}

	// 让相机沿着视线方向移动 雾气产生距离 的距离
	float s = step(100.0, length(positionToCamera));
	vec3 sub = mix(positionToCamera, normalize(positionToCamera) * 100.0, s);
	positionToCamera -= sub;
	cameraHeight = mix(pixelHeight, cameraHeight - 100.0 * vh, s);

	float b = mix(cameraHeight, fogMaxHeight, step(fogMaxHeight, cameraHeight));
	float a = mix(pixelHeight, fogMaxHeight, step(fogMaxHeight, pixelHeight));

	float fog = (b - a) - 0.5 * (pow(b, 2.0) - pow(a, 2.0)) / fogMaxHeight;
	fog = globalDensity * fog / vh; // 现在vh不会为0

	// 简化近距离雾计算，避免重复判断
	if(cameraHeight < fogMaxHeight) {
		float disToCamera = length(positionToCamera);
		fog = mix(fog, globalDensity * (1.0 - cameraHeight / fogMaxHeight) * disToCamera, step(0.01, abs(vh)));
	}

	// 降低雾的增长速度（从fog/(fog+1)改为fog/(fog+10)）
	fog = mix(0.0, 1.0, fog / (fog + 10.0));

	return fog;
}

void main(void) {
  vec4 color = texture(colorTexture, v_textureCoordinates);

  vec4 positionWC = getWorldCoordinate(depthTexture, v_textureCoordinates);
  float pixelHeight = getRoughHeight(positionWC);

  // 地表以下不算雾
  if (pixelHeight < 0.0) {
    out_FragColor = color;
    return;
  }

  // 高于雾层直接返回
  if (pixelHeight > u_fogHeight) {
    out_FragColor = color;
    return;
  }

  vec3 positionToCamera = vec3(positionWC.xyz - czm_viewerPositionWC);
  float fog = linearHeightFog(
    positionToCamera,
    u_cameraHeight,
    pixelHeight,
    u_fogHeight
  );

  // 降低雾混合比例上限（从0.8改为0.3，避免过度雾化）
  fog = clamp(fog, 0.0, 0.3);

  // 降低雾色亮度（从接近白色改为淡灰色，避免变白）
  out_FragColor = mix(color, vec4(u_fogColor, 1.0), fog);
}`;

        const customPostProcessStage = new Cesium.PostProcessStage({
            fragmentShader: fs,
            uniforms: {
                // 增加边界判断，避免极端值（关键修复）
                u_earthRadiusOnCamera: () => {
                    const cameraPos = this.viewer.camera.positionWC;
                    const cartographic = Cesium.Cartographic.fromCartesian(cameraPos);
                    const earthRadius = Cesium.Ellipsoid.WGS84.getRadius(cartographic);
                    return earthRadius; // 改用WGS84椭球半径，更准确
                },
                u_cameraHeight: () => Math.max(this.viewer.camera.positionCartographic.height, 0),
                u_fogColor: () => new Cesium.Color(0.5, 0.55, 0.6), // 淡灰色，远离白色
                u_fogHeight: () => 1000,
                u_globalDensity: () => 0.3, // 降低密度，减少雾化强度
            }
        });

        // 关键修复：将创建的后处理阶段赋值给实例变量
        this.atmosphereStage = customPostProcessStage;
        this.viewer.scene.postProcessStages.add(this.atmosphereStage);
        console.log('大气散射效果已启用');
    }

    /**
     * 移除大气散射效果（现在能正常生效）
     */
    destroy() {
        if (this.atmosphereStage) {
            this.viewer.scene.postProcessStages.remove(this.atmosphereStage);
            this.atmosphereStage.destroy(); // 显式销毁，释放资源
            this.atmosphereStage = null;
            console.log('大气散射效果已禁用');
        }
    }
}