{
  class ZenLibraryElement extends MozXULElement {
    #currentTab = null;
    #availableTabs = ['workspaces', 'mods'];

    static get markup() {
      return `
        <vbox id="zen-library-sidebar">
          <vbox id="zen-library-sidebar-buttons" flex="1">
            <toolbarbutton class="toolbarbutton-1 zen-library-sidebar-button" id="zen-library-sidebar-workspaces" data-l10n-id="zen-library-sidebar-workspaces"/>
            <toolbarbutton class="toolbarbutton-1 zen-library-sidebar-button" id="zen-library-sidebar-mods" data-l10n-id="zen-library-sidebar-mods"/>
          </vbox>
          <hbox id="zen-library-sidebar-footer">
            <toolbarbutton removable="true" class="chromeclass-toolbar-additional toolbarbutton-1 zen-sidebar-action-button" id="zen-open-library" command="cmd_zenToggleLibrary"></toolbarbutton>
          </hbox>
        </vbox>
        <vbox id="zen-library-content">
          <hbox content="workspaces" size="big">
          </hbox>
          <hbox content="mods" size="small"></hbox>
        </vbox>
      `;
    }

    static get inheritedAttributes() {
      return {
        '#zen-library-content': 'content,size=content-size',
        '#zen-library-sidebar': 'content',
      };
    }

    constructor() {
      super();
    }

    set currentTab(tab) {
      if (!this.#availableTabs.includes(tab)) {
        throw new Error(`Tab "${tab}" is not available in Zen Library.`);
      }
      this.#currentTab = tab;
      this.setAttribute('content', tab);
      // Also set if the size is big or small based on the tab.
      const element = this.querySelector(`#zen-library-content hbox[content="${tab}"]`);
      this.setAttribute('content-size', element.getAttribute('size') || 'small');
      for (const availableTab of this.#availableTabs) {
        const button = this.querySelector(`#zen-library-sidebar-${availableTab}`);
        if (availableTab === tab) {
          button.setAttribute('active', 'true');
        } else {
          button.removeAttribute('active');
        }
        const contentContainer = this.#getContentContainer(availableTab);
        if (availableTab === tab) {
          contentContainer.removeAttribute('hidden');
        } else {
          contentContainer.setAttribute('hidden', 'true');
        }
      }
    }

    get currentTab() {
      return this.#currentTab;
    }

    set open(value) {
      if (value) {
        this.setAttribute('open', 'true');
        this.onOpen(); // Trigger the onOpen method to populate the content
      } else {
        this.removeAttribute('open');
        this.onClose(); // Trigger the onClose method if needed
      }
    }

    get open() {
      return this.getAttribute('open') === 'true';
    }

    connectedCallback() {
      if (this.delayConnectedCallback()) {
        // If we are not ready yet, or if we have already connected, we
        // don't need to do anything.
        return;
      }

      this.id = 'zen-library';
      this.appendChild(this.constructor.fragment);
      this.initializeAttributeInheritance();

      for (const availableTab of this.#availableTabs) {
        const button = this.querySelector(`#zen-library-sidebar-${availableTab}`);
        button.addEventListener('command', () => {
          this.currentTab = availableTab;
        });
      }

      window.addEventListener('TabSelect', this);

      this.currentTab = 'workspaces'; // Default tab
    }

    #getContentContainer(tab) {
      return this.querySelector(`#zen-library-content hbox[content="${tab}"]`);
    }

    #createWorkspaceElement(workspace) {
      const fragment = window.MozXULElement.parseXULToFragment(`
        <vbox class="zen-workspace-item" zen-workspace-id="${workspace.uuid}">
          <hbox class="zen-workspace-item-header">
            <label class="zen-workspace-item-name"></label>
          </hbox>
          <vbox class="zen-workspace-item-content">
          </vbox>
        </vbox>
      `);

      const workspaceLabel = fragment.querySelector('.zen-workspace-item-name');
      workspaceLabel.textContent = workspace.name;
      workspaceLabel.addEventListener(
        'click',
        gZenVerticalTabsManager.renameTabStart.bind(gZenVerticalTabsManager)
      );

      const workspaceItem = fragment.querySelector('.zen-workspace-item');
      workspaceItem.style.setProperty(
        '--zen-workspace-gradient',
        gZenThemePicker.getGradient(workspace.theme.gradientColors, true, workspace.theme.rotation)
      );

      // TODO: Not jet! Figure this out
      //const workspaceElement = gZenWorkspaces.workspaceElement(workspace.uuid);
      //fragment.querySelector('.zen-workspace-item-content').appendChild(workspaceElement);

      return fragment;
    }

    async onOpen(event) {
      const conatainer = this.#getContentContainer('workspaces');
      conatainer.innerHTML = ''; // Clear the container

      const workspaces = await gZenWorkspaces._workspaces();
      for (const workspace of workspaces.workspaces) {
        const workspaceElement = this.#createWorkspaceElement(workspace);
        conatainer.appendChild(workspaceElement);
      }
    }

    async onClose(event) {}

    on_TabSelect(event) {
      if (!this.open) return;
      gZenLibrary.close();
    }
  }

  customElements.define('zen-library', ZenLibraryElement);

  class ZenLibrary {
    #animating = false;

    constructor() {
      ChromeUtils.defineLazyGetter(this, 'wrapper', () => document.getElementById('zen-library'));
    }

    get isOpen() {
      return this.wrapper.hasAttribute('open');
    }

    set isOpen(value) {
      if (this.#animating) {
        return; // Prevent multiple animations from running at the same time
      }
      this.#animating = true;
      if (value) {
        this.wrapper.open = value;
        this.animateLibrary(false).then(() => {
          this.#animating = false;
        });
      } else {
        this.animateLibrary(true).then(() => {
          this.wrapper.open = value;
          this.#animating = false;
        });
      }
    }

    open() {
      this.isOpen = true;
    }

    close() {
      this.isOpen = false;
    }

    toggle() {
      this.isOpen = !this.isOpen;
    }

    async animateLibrary(open) {
      window.docShell.treeOwner
        .QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsIAppWindow)
        .rollupAllPopups();

      let elementsToAnimate = [gNavToolbox];
      if (gZenVerticalTabsManager._hasSetSingleToolbar) {
        elementsToAnimate.push(gURLBar.textbox);
      }
      const wrapperWidth = this.wrapper.getBoundingClientRect().width;
      const appContentWrapper = document.getElementById('zen-appcontent-wrapper');
      if (open) {
        await Promise.all([
          gZenUIManager.motion.animate(
            elementsToAnimate,
            {
              transform: ['translateX(100%)', 'translateX(0)'],
              opacity: [0, 1],
            },
            {
              duration: 0.2,
              easing: 'ease-in-out',
            }
          ),
          gZenUIManager.motion.animate(
            this.wrapper,
            {
              marginLeft: ['0px', `${-wrapperWidth}px`],
              transform: ['translateX(0)', 'translateX(100%)'],
            },
            {
              duration: 0.2,
              easing: 'ease-in-out',
            }
          ),
        ]);
        appContentWrapper.style.minWidth = ''; // Reset the min-width after the animation
        gNavToolbox.style.display = ''; // Hide the toolbox during the animation
      } else {
        appContentWrapper.style.minWidth = `${appContentWrapper.getBoundingClientRect().width}px`;
        await Promise.all([
          gZenUIManager.motion.animate(
            elementsToAnimate,
            {
              transform: ['translateX(0)', 'translateX(100%)'],
              opacity: [1, 0],
            },
            {
              duration: 0.2,
              easing: 'ease-in-out',
            }
          ),
          gZenUIManager.motion.animate(
            this.wrapper,
            {
              marginLeft: [`${-wrapperWidth}px`, '0px'],
              transform: ['translateX(-100%)', 'translateX(0%)'],
            },
            {
              duration: 0.2,
              easing: 'ease-in-out',
            }
          ),
        ]);
        gNavToolbox.style.display = 'none'; // Show the toolbox after the animation
      }
    }
  }

  window.gZenLibrary = new ZenLibrary();
}
