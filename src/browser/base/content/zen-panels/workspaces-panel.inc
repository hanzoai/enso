# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

<panel flip="slide" type="arrow" orient="vertical" id="PanelUI-zen-workspaces" position="bottomright topright" mainview="true" side="left">
  <panelmultiview id="PanelUI-zen-workspaces-multiview" mainViewId="PanelUI-zen-workspaces-view">
    <panelview id="PanelUI-zen-workspaces-view" class="PanelUI-subView" role="document" mainview-with-header="true" has-custom-header="true" closemenu="none">
      <vbox>
        <hbox>
          <h3 data-l10n-id="zen-panel-ui-workspaces-text" id="PanelUI-zen-workspaces-header"></h3>
          <toolbarbutton id="PanelUI-zen-workspaces-reorder-mode" class="subviewbutton">
            <image></image>
          </toolbarbutton>
          <toolbarbutton id="PanelUI-zen-workspaces-new" class="subviewbutton" command="cmd_zenOpenWorkspaceCreation">
            <image></image>
          </toolbarbutton>
        </hbox>
      </vbox>
      <html:div id="PanelUI-zen-workspaces-list">
      </html:div>
    </panelview>
  </panelmultiview>
</panel>