import { useSelectableEntity } from '../contexts/file-tree-selectable'
import FileTreeIcon from './file-tree-icon'
import FileTreeItemInner from './file-tree-item/file-tree-item-inner'
import { IconFile } from "@/shared/svgs/build-icon"

function FileTreeDoc({
  name,
  id,
  isFile,
  isLinkedFile,
}: {
  name: string
  id: string
  isFile?: boolean
  isLinkedFile?: boolean
}) {
  const type = isFile ? 'file' : 'doc'

  const { isSelected, props: selectableEntityProps } = useSelectableEntity(
    id,
    type
  )

  return (
    <li
      // eslint-disable-next-line jsx-a11y/role-has-required-aria-props
      role="treeitem"
      // aria-selected is provided in selectableEntityProps
      {...selectableEntityProps}
      aria-label={name}
      tabIndex={0}
      style={{
        padding: '0 12px',
        marginBottom: 2
      }}
    >
      <FileTreeItemInner
        id={id}
        name={name}
        type={type}
        isSelected={isSelected}
        icons={<IconFile style={{ fontSize: 14, color: isSelected ? "#3c49dd" : "#4E5969", marginRight: 4 }} />}
      />
    </li>
  )
}

export default FileTreeDoc
