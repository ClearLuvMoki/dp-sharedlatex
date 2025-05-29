import { useTranslation } from 'react-i18next'
import * as eventTracking from '../../../infrastructure/event-tracking'
import { useFileTreeActionable } from '../contexts/file-tree-actionable'
import { useFileTreeData } from '@/shared/context/file-tree-data-context'
import OLTooltip from '@/features/ui/components/ol/ol-tooltip'
import MaterialIcon from '@/shared/components/material-icon'
import OLButtonToolbar from '@/features/ui/components/ol/ol-button-toolbar'
import importOverleafModules from '../../../../macros/import-overleaf-module.macro'
import React, { ElementType } from 'react'
import fileIcon from '@/shared/svgs/file.svg'
import folderIcon from '@/shared/svgs/folder.svg'
import uploadIcon from '@/shared/svgs/upload.svg'
import editIcon from '@/shared/svgs/edit.svg'
import deleteIcon from '@/shared/svgs/trash.svg'
import { IconFile, IconFolder, IconEdit, IconTrash, IconUpload } from "@/shared/svgs/build-icon"

const fileTreeToolbarComponents = importOverleafModules(
  'fileTreeToolbarComponents'
) as { import: { default: ElementType }; path: string }[]

function FileTreeToolbar() {
  const { fileTreeReadOnly } = useFileTreeData()
  const { t } = useTranslation()

  if (fileTreeReadOnly) return null

  return (
    <OLButtonToolbar
      className="toolbar toolbar-filetree"
      aria-label={t('project_files')}
    >
      <FileTreeToolbarLeft />
      <FileTreeToolbarRight />
    </OLButtonToolbar>
  )
}

function FileTreeToolbarLeft() {
  const { t } = useTranslation()
  const {
    canCreate,
    startCreatingFolder,
    startCreatingDocOrFile,
    startUploadingDocOrFile,
  } = useFileTreeActionable()

  const createWithAnalytics = () => {
    eventTracking.sendMB('new-file-click', { location: 'toolbar' })
    startCreatingDocOrFile()
  }

  const uploadWithAnalytics = () => {
    eventTracking.sendMB('upload-click', { location: 'toolbar' })
    startUploadingDocOrFile()
  }

  if (!canCreate) return null

  return (
    <div className="toolbar-left">
      <OLTooltip
        id="new-file"
        description={t('new_file')}
        overlayProps={{ placement: 'bottom' }}
      >
        <button className="btn" onClick={createWithAnalytics}>
          <IconFile style={{ width: 16, height: 16, color: "#4E5969" }} />
        </button>
      </OLTooltip>
      <OLTooltip
        id="new-folder"
        description={t('new_folder')}
        overlayProps={{ placement: 'bottom' }}
      >
        <button className="btn" onClick={startCreatingFolder} tabIndex={-1}>
          <IconFolder style={{ width: 16, height: 16, color: "#4E5969" }} />
        </button>
      </OLTooltip>
      <OLTooltip
        id="upload"
        description={t('upload')}
        overlayProps={{ placement: 'bottom' }}
      >
        <button className="btn" onClick={uploadWithAnalytics} tabIndex={-1}>
          <IconUpload style={{ width: 16, height: 16, color: "#4E5969" }} />
        </button>
      </OLTooltip>
    </div>
  )
}

function FileTreeToolbarRight() {
  const { t } = useTranslation()
  const { canRename, canDelete, startRenaming, startDeleting } =
    useFileTreeActionable()

  return (
    <div className="toolbar-right">
      {/* {fileTreeToolbarComponents.map(
        ({ import: { default: Component }, path }) => (
          <Component key={path} />
        )
      )} */}

      {canRename ? (
        <OLTooltip
          id="rename"
          description={t('rename')}
          overlayProps={{ placement: 'bottom' }}
        >
          <button className="btn" onClick={startRenaming} tabIndex={-1}>
            <IconEdit style={{ width: 16, height: 16, color: "#4E5969" }} />
          </button>
        </OLTooltip>
      ) : null}

      {canDelete ? (
        <OLTooltip
          id="delete"
          description={t('delete')}
          overlayProps={{ placement: 'bottom' }}
        >
          <button className="btn" onClick={startDeleting} tabIndex={-1}>
            <IconTrash style={{ width: 16, height: 16, color: "#4E5969" }} />
          </button>
        </OLTooltip>
      ) : null}
    </div>
  )
}

export default FileTreeToolbar
