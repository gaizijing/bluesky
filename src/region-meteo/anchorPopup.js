import './landing-popup.css';

const POPUP_BG = '/region-meteo-demo/landing-popup-bg.png';

/**
 * 地图锚点弹窗（起降点 / 点选气象共用样式）
 */
export class AnchorPopup {
  constructor(viewerInstance) {
    this.viewer = viewerInstance;
    this.anchor = null;
    this.root = null;
    this.postRenderHandler = null;
    this.#createDom();
  }

  #createDom() {
    const root = document.createElement('div');
    root.className = 'landing-overlay-root is-hidden';
    root.innerHTML =
      '<div class="landing-popup">'
      + '<button type="button" class="landing-popup__close" aria-label="关闭">×</button>'
      + '<div class="landing-popup__inner">'
      + '<h3 class="landing-popup__title"></h3>'
      + '<div class="landing-popup__rows"></div>'
      + '</div></div>';
    document.body.appendChild(root);
    root.querySelector('.landing-popup__close').addEventListener('click', () => this.hide());
    const inner = root.querySelector('.landing-popup__inner');
    if (inner) inner.style.backgroundImage = 'url(' + POPUP_BG + ')';
    this.root = root;
  }

  #ensurePostRender() {
    if (this.postRenderHandler) return;
    this.postRenderHandler = () => this.#syncPosition();
    this.viewer.scene.postRender.addEventListener(this.postRenderHandler);
  }

  #removePostRender() {
    if (!this.postRenderHandler) return;
    this.viewer.scene.postRender.removeEventListener(this.postRenderHandler);
    this.postRenderHandler = null;
  }

  #syncPosition() {
    if (!this.root || !this.anchor) return;
    const canvasCoords = this.viewer.scene.cartesianToCanvasCoordinates(this.anchor);
    if (!Cesium.defined(canvasCoords)) {
      this.root.classList.add('is-hidden');
      return;
    }
    const rect = this.viewer.canvas.getBoundingClientRect();
    this.root.style.left = (rect.left + canvasCoords.x) + 'px';
    this.root.style.top = (rect.top + canvasCoords.y) + 'px';
    this.root.classList.remove('is-hidden');
  }

  /**
   * @param {Cesium.Cartesian3} cartesian
   * @param {{ title: string, rows: Array<{ html?: string, text?: string }> }} content
   */
  show(cartesian, { title, rows = [] }) {
    if (!this.root || !cartesian) return;
    this.anchor = cartesian;
    this.root.querySelector('.landing-popup__title').textContent = title || '—';
    const box = this.root.querySelector('.landing-popup__rows');
    box.innerHTML = '';
    rows.forEach((row) => {
      const p = document.createElement('p');
      p.className = 'landing-popup__row';
      if (row.html != null) p.innerHTML = row.html;
      else p.textContent = row.text ?? '—';
      box.appendChild(p);
    });
    this.#ensurePostRender();
    this.#syncPosition();
    this.viewer.scene.requestRender();
  }

  hide() {
    this.anchor = null;
    if (this.root) this.root.classList.add('is-hidden');
    this.#removePostRender();
  }

  destroy() {
    this.hide();
    this.root?.remove();
    this.root = null;
  }
}
