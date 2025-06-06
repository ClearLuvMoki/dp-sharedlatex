import React, { ElementType } from 'react'
import { useTranslation } from 'react-i18next'
import MenuButton from './menu-button'
import CobrandingLogo from './cobranding-logo'
import BackToProjectsButton from './back-to-projects-button'
import UpgradePrompt from './upgrade-prompt'
import ChatToggleButton from './chat-toggle-button'
import LayoutDropdownButton from './layout-dropdown-button'
import OnlineUsersWidget from './online-users-widget'
import ProjectNameEditableLabel from './project-name-editable-label'
import TrackChangesToggleButton from './track-changes-toggle-button'
import HistoryToggleButton from './history-toggle-button'
import ShareProjectButton from './share-project-button'
import importOverleafModules from '../../../../macros/import-overleaf-module.macro'
import BackToEditorButton from './back-to-editor-button'
import getMeta from '@/utils/meta'
import { isSplitTestEnabled } from '@/utils/splitTestUtils'
import { canUseNewEditor } from '@/features/ide-redesign/utils/new-editor-utils'
import TryNewEditorButton from '../try-new-editor-button'
import { OnlineUser } from '@/features/ide-react/context/online-users-context'
import { Cobranding } from '../../../../../types/cobranding'
import arrowIcon from '@/shared/svgs/arrow.svg'
import { IconMenu } from '@/shared/svgs/build-icon'

const [publishModalModules] = importOverleafModules('publishModal') as {
  import: { default: ElementType }
  path: string
}[]
const PublishButton = publishModalModules?.import.default

const offlineModeToolbarButtons = importOverleafModules(
  'offlineModeToolbarButtons'
) as {
  import: { default: ElementType }
  path: string
}[]

// double opt-in
const enableROMirrorOnClient =
  isSplitTestEnabled('ro-mirror-on-client') &&
  new URLSearchParams(window.location.search).get('ro-mirror-on-client') ===
  'enabled'

const ToolbarHeader = React.memo(function ToolbarHeader({
  cobranding,
  onShowLeftMenuClick,
  chatIsOpen,
  toggleChatOpen,
  reviewPanelOpen,
  toggleReviewPanelOpen,
  historyIsOpen,
  toggleHistoryOpen,
  unreadMessageCount,
  onlineUsers,
  goToUser,
  isRestrictedTokenMember,
  hasPublishPermissions,
  chatVisible,
  projectName,
  renameProject,
  hasRenamePermissions,
  openShareModal,
  trackChangesVisible,
}: {
  cobranding: Cobranding | undefined
  onShowLeftMenuClick: () => void
  chatIsOpen: boolean
  toggleChatOpen: () => void
  reviewPanelOpen: boolean
  toggleReviewPanelOpen: (e: React.MouseEvent) => void
  historyIsOpen: boolean
  toggleHistoryOpen: () => void
  unreadMessageCount: number
  onlineUsers: OnlineUser[]
  goToUser: (user: OnlineUser) => void
  isRestrictedTokenMember: boolean | undefined
  hasPublishPermissions: boolean
  chatVisible: boolean
  projectName: string
  renameProject: (name: string) => void
  hasRenamePermissions: boolean
  openShareModal: () => void
  trackChangesVisible: boolean | undefined
}) {
  const chatEnabled = getMeta('ol-chatEnabled')

  const { t } = useTranslation()
  const shouldDisplayPublishButton = hasPublishPermissions && PublishButton

  return (
    <header
      className="toolbar toolbar-header"
      role="navigation"
      aria-label={t('project_layout_sharing_submission')}
      style={{
        borderBottom: "1px solid #E5E6EB"
      }}
    >
      <div 
        style={{ display: "flex", cursor: "pointer", userSelect: "none" }}
        onClick={() => {
          window.location.href = '/project'
        }}
      >
        <img src={arrowIcon} />
        <span
          style={{
            color: "#1D2129",
            marginLeft: 8,
            fontSize: 16,
            fontWeight: 500
          }}
        >{t("create")}</span>
      </div>
      <IconMenu style={{color: "#4E5969", fontSize: 18, cursor: "pointer", margin: "0 6px"}} onClick={onShowLeftMenuClick}/>

      {/* <div className="toolbar-left">
        {cobranding && cobranding.logoImgUrl && (
          <CobrandingLogo {...cobranding} />
        )}
        <BackToProjectsButton />
        {enableROMirrorOnClient &&
          offlineModeToolbarButtons.map(
            ({ path, import: { default: OfflineModeToolbarButton } }) => {
              return <OfflineModeToolbarButton key={path} />
            }
          )}
      </div>
      {getMeta('ol-showUpgradePrompt') && (
        <div className="d-flex align-items-center">
          <UpgradePrompt />
        </div>
      )}
      <ProjectNameEditableLabel
        className="toolbar-center"
        projectName={projectName}
        hasRenamePermissions={hasRenamePermissions}
        onChange={renameProject}
      />

      <div className="toolbar-right">
        {canUseNewEditor() && <TryNewEditorButton />}

        <OnlineUsersWidget onlineUsers={onlineUsers} goToUser={goToUser} />

        {historyIsOpen ? (
          <div className="d-flex align-items-center">
            <BackToEditorButton onClick={toggleHistoryOpen} />
          </div>
        ) : (
          <>
            {trackChangesVisible && (
              <TrackChangesToggleButton
                onMouseDown={toggleReviewPanelOpen}
                disabled={historyIsOpen}
                trackChangesIsOpen={reviewPanelOpen}
              />
            )}

            <ShareProjectButton onClick={openShareModal} />
            {shouldDisplayPublishButton && (
              <PublishButton cobranding={cobranding} />
            )}

            {!isRestrictedTokenMember && (
              <HistoryToggleButton onClick={toggleHistoryOpen} />
            )}

            <LayoutDropdownButton />

            {chatEnabled && chatVisible && (
              <ChatToggleButton
                chatIsOpen={chatIsOpen}
                onClick={toggleChatOpen}
                unreadMessageCount={unreadMessageCount}
              />
            )}
          </>
        )}
      </div> */}
    </header>
  )
})

export default ToolbarHeader
