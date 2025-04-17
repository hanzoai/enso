var { Downloads } = ChromeUtils.importESModule('resource://gre/modules/Downloads.sys.mjs');

{
  const CONFIG = Object.freeze({
    ANIMATION: {
      FADE_DURATION: 300,
      ARC_STEPS: 60,
      DURATION: 1500,
      MAX_ARC_HEIGHT: 500,
      ARC_HEIGHT_RATIO: 0.8, // Arc height = distance * ratio (capped at MAX_ARC_HEIGHT)
      SCALE_END: 0.5, // Final scale at destination
    },
  });

  class ZenDownloadAnimation extends ZenDOMOperatedFeature {
    async init() {
      this._lastClickPosition = null;
      this._lastClickTime = 0;
      this._setupClickListener();
      await this._setupDownloadListeners();
    }

    _setupClickListener() {
      document.addEventListener(
        'mousedown',
        (event) => {
          this._lastClickPosition = {
            clientX: event.clientX,
            clientY: event.clientY,
          };
        },
        true
      );
    }

    _getLastClickPosition() {
      if (this._lastClickPosition) {
        return this._lastClickPosition;
      }
      return null;
    }

    async _setupDownloadListeners() {
      try {
        const list = await Downloads.getList(Downloads.ALL);
        list.addView({
          onDownloadAdded: () => {
            this._handleNewDownload();
          },
        });
      } catch (error) {
        console.error('Failed to set up download listeners:', error);
        throw error;
      }
    }

    _animateDownload(startPosition) {
      const animationElement = document.querySelector('zen-download-animation');
      if (animationElement) {
        animationElement.initializeAnimation(startPosition);
      } else {
        if (!document.querySelector('zen-download-animation')) {
          const downloadAnimation = document.createElement('zen-download-animation');
          document.body.appendChild(downloadAnimation);
        }
      }
    }

    _handleNewDownload() {
      const clickPosition = this._getLastClickPosition();

      if (!clickPosition) {
        console.warn('No recent click position available for animation');
        return;
      }

      this._animateDownload(clickPosition);
    }
  }

  class ZenDownloadAnimationElement extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._createStyles();
    }
    _createStyles() {
      const style = document.createElement('style');
      style.textContent = `
        :host {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 9999;
        }
        .download-animation {
          position: absolute;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          background-color: var(--zen-primary-color);
        }
        .download-animation-inner-circle {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background-color: black;
        }
        .download-animation-icon {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: var(--zen-primary-color);
          -webkit-mask: url("chrome://browser/content/zen-images/downloads/download.svg") no-repeat center;
          -webkit-mask-size: 70%;
          mask: url("chrome://browser/content/zen-images/downloads/download.svg") no-repeat center;
          mask-size: 70%;
        }
        `;
      this.shadowRoot.appendChild(style);
    }

    _createAnimationElement(startPosition) {
      const animationElement = document.createElement('div');
      animationElement.className = 'download-animation';
      animationElement.style.position = 'absolute';
      animationElement.style.left = `${startPosition.clientX}px`;
      animationElement.style.top = `${startPosition.clientY}px`;
      animationElement.style.transform = 'translate(-50%, -50%)';

      const innerCircle = document.createElement('div');
      innerCircle.className = 'download-animation-inner-circle';

      const icon = document.createElement('div');
      icon.className = 'download-animation-icon';

      innerCircle.appendChild(icon);
      animationElement.appendChild(innerCircle);
      this.shadowRoot.appendChild(animationElement);
      return animationElement;
    }

    initializeAnimation(startPosition) {
      if (!startPosition) {
        console.warn('No start position provided, skipping animation');
        return;
      }

      const downloadsButton = document.getElementById('downloads-button');

      if (!downloadsButton) {
        console.warn('Downloads button not found, skipping animation');
        return;
      }

      const buttonRect = downloadsButton.getBoundingClientRect();
      const endPosition = {
        clientX: buttonRect.left + buttonRect.width / 2,
        clientY: buttonRect.top + buttonRect.height / 2,
      };

      const animationElement = this._createAnimationElement(startPosition);

      const distance = this._calculateDistance(startPosition, endPosition);
      const arcHeight = Math.min(distance * CONFIG.ANIMATION.ARC_HEIGHT_RATIO, CONFIG.ANIMATION.MAX_ARC_HEIGHT);

      this._runAnimationSequence(animationElement, startPosition, endPosition, arcHeight);
    }

    _calculateDistance(start, end) {
      const distanceX = end.clientX - start.clientX;
      const distanceY = end.clientY - start.clientY;
      return Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    }

    _runAnimationSequence(element, start, end, arcHeight) {
      try {
        const distanceX = end.clientX - start.clientX;
        const distanceY = end.clientY - start.clientY;

        this._runAnimation(element, distanceX, distanceY, arcHeight);
      } catch (error) {
        console.error('Error in animation sequence:', error);
        this._cleanupAnimation(element);
      }
    }

    _runAnimation(element, distanceX, distanceY, arcHeight) {
      this._createArcAnimation(element, distanceX, distanceY, arcHeight).onfinish = () => {
        this._fadeOutAnimation(element);
      };
    }

    _createArcAnimation(element, distanceX, distanceY, arcHeight) {
      const keyframes = [];
      const steps = CONFIG.ANIMATION.ARC_STEPS;
      const endScale = CONFIG.ANIMATION.SCALE_END;

      const opacityValues = [];
      const scaleValues = [];

      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;

        let opacity;
        if (progress < 0.3) {
          opacity = 0.3 + (progress / 0.3) * 0.6;
        } else if (progress < 0.5) {
          opacity = 0.9 + ((progress - 0.3) / 0.2) * 0.1;
        } else {
          opacity = 1;
        }
        opacityValues.push(opacity);

        let scale;
        if (progress < 0.3) {
          scale = 0.5 + (progress / 0.3) * 0.5;
        } else if (progress < 0.5) {
          scale = 1 + ((progress - 0.3) / 0.2) * 0.05;
        } else {
          scale = 1.05 - ((progress - 0.5) / 0.5) * (1.05 - endScale);
        }
        scaleValues.push(scale);

        const x = distanceX * progress;

        const adjustedProgress = progress * 2 - 1; // -1 to 1
        const verticalOffset = -arcHeight * (1 - adjustedProgress * adjustedProgress);
        const y = distanceY * progress + verticalOffset;

        let rotation = 0;
        let previousRotation = 0;

        if (i > 0 && i < steps) {
          const prevProgress = (i - 1) / steps;
          const prevX = distanceX * prevProgress;
          const prevAdjustedProgress = prevProgress * 2 - 1;
          const prevVerticalOffset = -arcHeight * (1 - prevAdjustedProgress * prevAdjustedProgress);
          const prevY = distanceY * prevProgress + prevVerticalOffset;

          const targetRotation = Math.atan2(y - prevY, x - prevX) * (180 / Math.PI);

          rotation = previousRotation + (targetRotation - previousRotation) * 0.1;

          previousRotation = rotation;
        }

        keyframes.push({
          offset: progress,
          opacity: opacityValues[i],
          transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%)) rotate(${rotation}deg) scale(${scaleValues[i]})`,
        });
      }

      return element.animate(keyframes, {
        duration: CONFIG.ANIMATION.DURATION,
        easing: 'cubic-bezier(0.37, 0, 0.63, 1)',
        fill: 'forwards',
      });
    }

    _fadeOutAnimation(element) {
      element.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: CONFIG.ANIMATION.FADE_DURATION,
        fill: 'forwards',
      }).onfinish = () => this._cleanupAnimation(element);
    }

    _cleanupAnimation(element) {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }
  }

  customElements.define('zen-download-animation', ZenDownloadAnimationElement);

  const zenDownloadAnimation = new ZenDownloadAnimation();
  zenDownloadAnimation.init().catch(console.error);
}
