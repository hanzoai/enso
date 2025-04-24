var { Downloads } = ChromeUtils.importESModule('resource://gre/modules/Downloads.sys.mjs');

{
  const CONFIG = Object.freeze({
    ANIMATION: {
      ARC_STEPS: 60,
      MAX_ARC_HEIGHT: 800,
      ARC_HEIGHT_RATIO: 0.8, // Arc height = distance * ratio (capped at MAX_ARC_HEIGHT)
      SCALE_END: 0.45, // Final scale at destination
    },
  });

  class ZenDownloadAnimation extends ZenDOMOperatedFeature {
    async init() {
      this._lastClickPosition = null;
      this._setupClickListener();
      await this._setupDownloadListeners();
    }

    _setupClickListener() {
      document.addEventListener('mousedown', this._handleClick.bind(this), true);
    }

    _handleClick(event) {
      this._lastClickPosition = {
        clientX: event.clientX,
        clientY: event.clientY,
      };
    }

    async _setupDownloadListeners() {
      try {
        const list = await Downloads.getList(Downloads.ALL);
        list.addView({
          onDownloadAdded: this._handleNewDownload.bind(this),
        });
      } catch (error) {
        console.error('Failed to set up download animation listeners:', error);
        throw error;
      }
    }

    _handleNewDownload() {
      if (!Services.prefs.getBoolPref('zen.animations.download-animation')) {
        return;
      }

      if (!this._lastClickPosition) {
        console.warn('No recent click position available for animation');
        return;
      }

      this._animateDownload(this._lastClickPosition);
    }

    _animateDownload(startPosition) {
      let animationElement = document.querySelector('zen-download-animation');
      if (!animationElement) {
        animationElement = document.createElement('zen-download-animation');
        document.body.appendChild(animationElement);
      } else {
        animationElement.initializeAnimation(startPosition);
      }
    }
  }

  class ZenDownloadAnimationElement extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._loadStyles();
    }

    _loadStyles() {
      const linkElem = document.createElement('link');
      linkElem.setAttribute('rel', 'stylesheet');
      linkElem.setAttribute('href', 'chrome://browser/content/zen-styles/zen-download-animation.css');
      this.shadowRoot.appendChild(linkElem);
    }

    _createAnimationElement(startPosition) {
      const animationHTML = `
          <div class="zen-download-animation">
            <div class="zen-download-animation-inner-circle">
              <div class="zen-download-animation-icon"></div>
            </div>
          </div>
        `;

      const fragment = window.MozXULElement.parseXULToFragment(animationHTML);
      const animationElement = fragment.querySelector('.zen-download-animation');

      animationElement.style.left = `${startPosition.clientX}px`;
      animationElement.style.top = `${startPosition.clientY}px`;
      animationElement.style.transform = 'translate(-50%, -50%)';

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

      const isVisible = this._isElementVisible(downloadsButton);
      if (!isVisible) {
        console.warn('Downloads button is not visible, skipping animation');
        return;
      }

      const buttonRect = downloadsButton.getBoundingClientRect();
      const endPosition = {
        clientX: buttonRect.left + buttonRect.width / 2,
        clientY: buttonRect.top + buttonRect.height / 2,
      };

      const animationElement = this._createAnimationElement(startPosition);
      const distance = this._calculateDistance(startPosition, endPosition);

      // Determine optimal arc direction based on available space
      const { arcHeight, shouldArcDownward } = this._calculateOptimalArc(startPosition, endPosition, distance);

      this._runAnimationSequence(animationElement, startPosition, endPosition, arcHeight, shouldArcDownward);
    }

    _calculateOptimalArc(startPosition, endPosition, distance) {
      // Calculate available space for the arc
      const availableTopSpace = Math.min(startPosition.clientY, endPosition.clientY);
      const viewportHeight = window.innerHeight;
      const availableBottomSpace = viewportHeight - Math.max(startPosition.clientY, endPosition.clientY);

      // Determine if we should arc downward or upward based on available space
      const shouldArcDownward = availableBottomSpace > availableTopSpace;

      // Use the space in the direction we're arcing
      const availableSpace = shouldArcDownward ? availableBottomSpace : availableTopSpace;

      // Limit arc height to a percentage of the available space
      const arcHeight = Math.min(
        distance * CONFIG.ANIMATION.ARC_HEIGHT_RATIO,
        CONFIG.ANIMATION.MAX_ARC_HEIGHT,
        availableSpace * 0.8
      );

      return { arcHeight, shouldArcDownward };
    }

    _calculateDistance(start, end) {
      const distanceX = end.clientX - start.clientX;
      const distanceY = end.clientY - start.clientY;
      return Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    }

    _runAnimationSequence(element, start, end, arcHeight, shouldArcDownward) {
      try {
        const distanceX = end.clientX - start.clientX;
        const distanceY = end.clientY - start.clientY;

        const arcAnimation = this._createArcAnimation(element, distanceX, distanceY, arcHeight, shouldArcDownward);
        arcAnimation.onfinish = () => this._cleanupAnimation(element);
      } catch (error) {
        console.error('Error in animation sequence:', error);
        this._cleanupAnimation(element);
      }
    }

    _createArcAnimation(element, distanceX, distanceY, arcHeight, shouldArcDownward) {
      const keyframes = [];
      const arcDirection = shouldArcDownward ? 1 : -1;
      const steps = CONFIG.ANIMATION.ARC_STEPS;
      const endScale = CONFIG.ANIMATION.SCALE_END;

      function easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      }

      let previousRotation = 0;
      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const eased = easeInOutQuad(progress);

        // Calculate opacity changes
        let opacity;
        if (progress < 0.3) {
          // Fade in during first 30%
          opacity = 0.3 + (progress / 0.3) * 0.6;
        } else if (progress < 0.98) {
          // Slight increase to full opacity
          opacity = 0.9 + ((progress - 0.3) / 0.6) * 0.1;
        } else {
          // Decrease opacity in the final steps
          opacity = 1 - ((progress - 0.9) / 0.1) * 1;
        }

        // Calculate scaling changes
        let scale;
        if (progress < 0.5) {
          scale = 0.5 + (progress / 0.5) * 1.3;
        } else {
          scale = 1.8 - ((progress - 0.5) / 0.5) * (1.8 - endScale);
        }

        // Position on arc
        const x = distanceX * eased;
        const y = distanceY * eased + arcDirection * arcHeight * (1 - (2 * eased - 1) ** 2);

        // Calculate rotation to point in the direction of movement
        let rotation = previousRotation;
        if (i > 0) {
          const prevEased = easeInOutQuad((i - 1) / steps);

          const prevX = distanceX * prevEased;
          const prevAdjustedProgress = prevEased * 2 - 1;
          const prevVerticalOffset = arcDirection * arcHeight * (1 - prevAdjustedProgress * 2);
          const prevY = distanceY * prevEased + prevVerticalOffset;

          const targetRotation = Math.atan2(y - prevY, x - prevX) * (180 / Math.PI);

          rotation += (targetRotation - previousRotation) * 0.01;
          previousRotation = rotation;
        }

        keyframes.push({
          offset: progress,
          opacity: opacity,
          transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%)) rotate(${rotation}deg) scale(${scale})`,
        });
      }

      return element.animate(keyframes, {
        duration: Services.prefs.getIntPref('zen.animations.download-animation-duration'),
        easing: 'cubic-bezier(0.37, 0, 0.63, 1)',
        fill: 'forwards',
      });
    }

    _cleanupAnimation(element) {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      } else {
        console.warn('Error cleaning download animation');
      }
    }

    _isElementVisible(element) {
      if (!element) return false;

      const rect = element.getBoundingClientRect();

      // Element must be in the viewport
      if (rect.bottom < 0 || rect.right < 0 || rect.top > window.innerHeight || rect.left > window.innerWidth) {
        return false;
      }

      return true;
    }
  }

  customElements.define('zen-download-animation', ZenDownloadAnimationElement);

  new ZenDownloadAnimation().init().catch(console.error);
}
