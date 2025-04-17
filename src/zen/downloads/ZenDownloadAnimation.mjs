var { Downloads } = ChromeUtils.importESModule('resource://gre/modules/Downloads.sys.mjs');

{
  const CONFIG = Object.freeze({
    ANIMATION: {
      APPEAR_DURATION: 400,
      FADE_DURATION: 300,
      ARC_STEPS: 30,
      DISTANCE_MULTIPLIER: 2, // Animation duration = distance * multiplier
      MAX_ARC_HEIGHT: 200,
      ARC_HEIGHT_RATIO: 0.8, // Arc height = distance * ratio (capped at MAX_ARC_HEIGHT)
      SCALE_END: 0.5, // Final scale at destination
    },
    FILE_TYPES: {
      document: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx'],
      image: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'tiff', 'ico'],
      audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'],
      video: ['mp4', 'webm', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'm4v'],
      archive: ['zip', 'rar', 'tar', 'gz', '7z', 'bz2', 'xz'],
      application: ['exe', 'dmg', 'pkg', 'apk', 'msi', 'deb', 'rpm'],
    },
  });

  class ZenAnimationController {
    constructor() {
      this._lastClickPosition = null;
      this._lastClickTime = 0;
    }

    async init() {
      this._ensureAnimationComponent();
      this._setupClickListener();

      console.log('Animation controller initialized');
    }

    _ensureAnimationComponent() {
      if (!document.body) {
        // Document not ready, try again later
        setTimeout(() => this._ensureAnimationComponent(), 100);
        return;
      }

      if (!document.querySelector('zen-download-animation')) {
        const downloadAnimation = document.createElement('zen-download-animation');
        document.body.appendChild(downloadAnimation);
        console.log('Download animation component added to document body');
      }
    }

    _setupClickListener() {
      const handleClick = (event) => {
        this._lastClickPosition = {
          clientX: event.clientX,
          clientY: event.clientY,
        };
      };

      // Add regular click listener
      document.addEventListener('click', handleClick, true);

      // Add right-click (contextmenu) listener
      document.addEventListener('contextmenu', handleClick, true);

      // Track mousedown events for more reliable position capture
      document.addEventListener(
        'mousedown',
        (event) => {
          // Only track right mouse button (button 2)
          if (event.button === 2) {
            handleClick(event);
          }
        },
        true
      );

      console.log('Global click and contextmenu listeners registered');
    }

    getLastClickPosition() {
      if (this._lastClickPosition) {
        return this._lastClickPosition;
      }
      return null;
    }

    getFileTypeFromPath(pathname) {
      if (!pathname) return 'generic';

      try {
        const extension = pathname.split('.').pop().toLowerCase();

        // Check each file type category
        for (const [type, extensions] of Object.entries(CONFIG.FILE_TYPES)) {
          if (extensions.includes(extension)) {
            return type;
          }
        }
      } catch (error) {
        console.warn('Error parsing URL for file type:', error);
      }

      return 'generic';
    }

    animateDownload(startPosition, fileType) {
      this._triggerAnimation(startPosition, fileType);
    }

    _triggerAnimation(startPosition, fileType) {
      const animationElement = document.querySelector('zen-download-animation');
      if (animationElement) {
        animationElement.initializeAnimation(startPosition, fileType);
      } else {
        console.error('Animation component not found in the DOM');
        this._ensureAnimationComponent();
      }
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
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          opacity: 0;
          transform: translate(-50%, -50%);
          will-change: transform, opacity;
        }
        .document {
          background-image: url("chrome://browser/content/zen-images/downloads-icons/document.svg");
        }
        .image {
          background-image: url("chrome://browser/content/zen-images/downloads-icons/image.svg");
        }
        .audio {
          background-image: url("chrome://browser/content/zen-images/downloads-icons/audio.svg");
        }
        .video {
          background-image: url("chrome://browser/content/zen-images/downloads-icons/video.svg");
        }
        .archive {
          background-image: url("chrome://browser/content/zen-images/downloads-icons/archive.svg");
        }
        .application {
          background-image: url("chrome://browser/content/zen-images/downloads-icons/application.svg");
        }
        .generic {
          background-image: url("chrome://browser/content/zen-images/downloads-icons/download.svg");
        }
      `;
      this.shadowRoot.appendChild(style);
    }

    initializeAnimation(startPosition, fileType) {
      if (!startPosition) {
        console.log('No start position provided, skipping animation');
        return;
      }

      // Find the download button
      const downloadsButton = document.getElementById('downloads-button');
      if (!downloadsButton) {
        console.warn('Downloads button not found, skipping animation');
        return;
      }

      // Calculate end position (center of downloads button)
      const buttonRect = downloadsButton.getBoundingClientRect();
      const endPosition = {
        clientX: buttonRect.left + buttonRect.width / 2,
        clientY: buttonRect.top + buttonRect.height / 2,
      };

      const animationElement = this._createAnimationElement(startPosition, fileType);

      const distance = this._calculateDistance(startPosition, endPosition);
      const arcHeight = Math.min(distance * CONFIG.ANIMATION.ARC_HEIGHT_RATIO, CONFIG.ANIMATION.MAX_ARC_HEIGHT);

      this._runAnimationSequence(animationElement, startPosition, endPosition, distance, arcHeight, downloadsButton);
    }

    _createAnimationElement(startPosition, fileType) {
      const animationElement = document.createElement('div');
      animationElement.className = `download-animation ${fileType || 'generic'}`;
      animationElement.style.position = 'absolute';
      animationElement.style.left = `${startPosition.clientX}px`;
      animationElement.style.top = `${startPosition.clientY}px`;
      animationElement.style.opacity = '0';
      animationElement.style.transform = 'translate(-50%, -50%)';
      this.shadowRoot.appendChild(animationElement);
      return animationElement;
    }

    _calculateDistance(start, end) {
      const distanceX = end.clientX - start.clientX;
      const distanceY = end.clientY - start.clientY;
      return Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    }

    _runAnimationSequence(element, start, end, distance, arcHeight, downloadsButton) {
      try {
        const distanceX = end.clientX - start.clientX;
        const distanceY = end.clientY - start.clientY;

        this._runAnimation(element, distanceX, distanceY, distance, arcHeight, downloadsButton);
      } catch (error) {
        console.error('Error in animation sequence:', error);
        this._cleanupAnimation(element);
      }
    }

    _runAnimation(element, distanceX, distanceY, distance, arcHeight, downloadsButton) {
      // Appear with a pop effect
      gZenUIManager.motion.animate(
        element,
        {
          opacity: [0, 1],
          scale: [0.5, 1.2, 1],
        },
        {
          duration: CONFIG.ANIMATION.APPEAR_DURATION / 1000, // Convert to seconds for motion module
          ease: [0.34, 1.56, 0.64, 1], // Spring-like overshoot
          onComplete: () => {
            // Create the arc trajectory animation
            this._createArcAnimation(element, distanceX, distanceY, distance, arcHeight).onfinish = () => {
              // Add feedback to the downloads button
              this._animateButtonFeedback(downloadsButton);

              // Fade out the animation element
              this._fadeOutAnimation(element);
            };
          },
        }
      );
    }

    _createArcAnimation(element, distanceX, distanceY, distance, arcHeight) {
      const keyframes = [];
      const steps = CONFIG.ANIMATION.ARC_STEPS;

      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;

        // Calculate horizontal position (linear)
        const x = distanceX * progress;

        // Calculate vertical position (parabolic arc)
        const adjustedProgress = progress * 2 - 1; // -1 to 1
        const verticalOffset = -arcHeight * (1 - adjustedProgress * adjustedProgress);
        const y = distanceY * progress + verticalOffset;

        // Scale down as it reaches the destination
        let scale = 1 - (1 - CONFIG.ANIMATION.SCALE_END) * progress;

        keyframes.push({
          offset: progress,
          transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%)) rotate(0deg) scale(${scale})`,
        });
      }

      return element.animate(keyframes, {
        duration: distance * CONFIG.ANIMATION.DISTANCE_MULTIPLIER,
        easing: 'cubic-bezier(0.37, 0, 0.63, 1)',
        fill: 'forwards',
      });
    }

    _animateButtonFeedback(button) {
      button.animate(
        [
          { boxShadow: '0 0 0 0 rgba(0, 128, 255, 0)', transform: 'scale(1)' },
          { boxShadow: '0 0 8px 2px rgba(0, 128, 255, 0.5)', transform: 'scale(1.08)' },
          { boxShadow: '0 0 0 0 rgba(0, 128, 255, 0)', transform: 'scale(1)' },
        ],
        {
          duration: 500,
          easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        }
      );
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

  class ZenDownloadAnimation {
    constructor() {
      this.animationController = new ZenAnimationController();
    }

    async init() {
      console.log('Initializing download manager...');

      try {
        // Initialize the animation controller
        await this.animationController.init();

        // Set up download listeners
        await this._setupDownloadListeners();

        console.log('Download animation initialized successfully');
      } catch (error) {
        console.error('Failed to initialize download animation:', error);
      }
    }

    async _setupDownloadListeners() {
      try {
        const list = await Downloads.getList(Downloads.ALL);

        list.addView({
          onDownloadAdded: (download) => {
            console.log('New download detected:', download);
            this._handleNewDownload(download);
          },
        });

        console.log('Download listeners set up successfully');
      } catch (error) {
        console.error('Failed to set up download listeners:', error);
        throw error;
      }
    }

    _handleNewDownload(download) {
      // Get the last click position
      const clickPosition = this.animationController.getLastClickPosition();

      console.log('Download initiated:', download.source.url);

      if (!clickPosition) {
        console.log('No recent click position available for animation');
        return;
      }

      // Get the file type from the URL
      const fileType = this.animationController.getFileTypeFromPath(download.target.path);
      console.log(`Animating download for ${fileType} file from ${download.source.url}`);

      this.animationController.animateDownload(clickPosition, fileType);
    }
  }

  customElements.define('zen-download-animation', ZenDownloadAnimationElement);

  const zenDownloadAnimation = new ZenDownloadAnimation();
  zenDownloadAnimation.init().catch(console.error);
}
