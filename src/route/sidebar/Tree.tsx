import { Link, useNavigate } from "react-router-dom";
import { s, styled } from "style/stitches.config";
import {
  ReaderIcon,
  DragHandleDots2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  DotsHorizontalIcon,
} from "@radix-ui/react-icons";
import { useNoteParams } from "route/notes/note/params";
import { useState } from "react";
import { LoadingShim } from "component/ui/LoadingShim";
import { NodeType, TreeNode, useNoteTreeQuery } from "api/tree";
import { invariant } from "exception/invariant";
import { DragOverlay, useDndContext } from "@dnd-kit/core";
import {
  useDraggableNode,
  useNodeCreate,
  useNodeDelete,
  useNoteTreeDrag,
} from "./hooks";
import { When } from "component/When";
import Spacer from "component/ui/Spacer";
import { DirectoryDropzone, NodeName } from "./components";
import { NodeDropdown } from "./dropdown";

export function NoteTree({ width }: { width: number }) {
  const { data: tree, error, isLoading } = useNoteTreeQuery();

  const DragContext = useNoteTreeDrag();

  if (isLoading) {
    return <LoadingShim />;
  }

  if (error) {
    return <s.div css={{ flex: 1 }}>Error: {error.message}</s.div>;
  }

  return (
    <NoteNodes css={{ flex: 1 }}>
      <DragContext>
        <DirectoryDropzone directoryKey={null} css={{ flex: 1 }}>
          {tree?.map((node) => (
            <NoteTreeNode key={node.key} node={node} />
          ))}
        </DirectoryDropzone>
        <DragOverlay style={{ width: width - 8 - 8 }}>
          <PreviewNode />
        </DragOverlay>
      </DragContext>
    </NoteNodes>
  );
}
const NoteNodes = styled("ul", {
  m: 0,
  p: 8,
  d: "flex",
  direction: "column",
});

function PreviewNode() {
  const { active, over } = useDndContext();

  if (!active) return null; // no component being dragged

  const { id, data } = active;
  //@ts-expect-error DnD-Kit lacks strict typing
  const { name, type } = data.current;

  return (
    <NoteTreeNode
      node={{
        key: id.toString(),
        name,
        parentKey: over?.id.toString() ?? null,
        type,
        children: [],
      }}
    />
  );
}

function NoteTreeNode({ node }: { node: TreeNode }) {
  const { noteKey } = useNoteParams({ noexcept: true });
  const navigate = useNavigate();

  const isNote = node.type === "note";
  const isDirectory = node.type === "directory";
  const selected = noteKey === node.key;

  invariant(!isNote || !isDirectory, `Unknown node type: ${node}`);

  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const { handle: DragHandle, isDragging, ref } = useDraggableNode(node);

  const deleteNode = useNodeDelete(node);
  const handleDelete = () => {
    deleteNode();
    navigate("/");
  };

  const newNodeParentKey = isNote ? node.parentKey : node.key;

  const handleDirectoryCreate = useNodeCreate("directory", {
    parentKey: newNodeParentKey,
  });

  const handleNoteCreate = useNodeCreate("note", {
    parentKey: newNodeParentKey,
    onSuccess(key) {
      navigate(key);
    },
  });

  const handleNodeCopyLink = () => {
    const location = window.location.href;
    const url = `${location}${location.endsWith("/") ? "" : "/"}${node.key}`;
    navigator.clipboard.writeText(url);
  };

  const Icon = getIcon(node.type, expanded);

  const row = (
    <>
      <NoteInner
        ref={ref}
        expanded={expanded}
        {...(isNote
          ? { as: Link, to: node.key }
          : { as: s.button, onClick: () => setExpanded(!expanded) })}
      >
        <DragHandle>
          <When
            condition={`${NoteNodeRoot}:hover &`}
            fallback={<Icon />}
            css={{ d: "flex", items: "center", justify: "center" }}
          >
            <DragHandleDots2Icon />
          </When>
        </DragHandle>
        <NodeName
          renaming={renaming}
          onRenamingChange={setRenaming}
          node={node}
        />
      </NoteInner>
      <When
        condition={open ? true : `${NoteNodeRoot}:hover &`}
        css={{ h: "100%" }}
      >
        <NodeDropdown
          type={node.type}
          open={open}
          onOpenChange={setOpen}
          onRename={() => setRenaming(true)}
          onDelete={handleDelete}
          onCreateSubdirectory={handleDirectoryCreate}
          onCreateNote={handleNoteCreate}
          onCopyNodeLink={handleNodeCopyLink}
        >
          <DropdownButton>
            <DotsHorizontalIcon />
          </DropdownButton>
        </NodeDropdown>
      </When>
    </>
  );

  const id = "node-" + node.key;

  if (isNote) {
    return (
      <NoteNodeRoot selected={selected} hide={isDragging} id={id}>
        {row}
      </NoteNodeRoot>
    );
  }

  return (
    <>
      <DirectoryDropzone directoryKey={node.key}>
        <NoteNodeRoot selected={selected} hide={isDragging} id={id}>
          {row}
        </NoteNodeRoot>
        {expanded && (
          <>
            <SubDirectories>
              {node.children?.map((child) => (
                <NoteTreeNode key={child.key} node={child} />
              ))}
            </SubDirectories>
            {!!node.children.length && <Spacer size="ty" />}
          </>
        )}
      </DirectoryDropzone>
    </>
  );
}

function getIcon(type: NodeType, expanded: boolean) {
  if (type === "note") return ReaderIcon;
  return expanded ? ChevronDownIcon : ChevronRightIcon;
}

const NoteInner = styled(s.div, {
  d: "grid",
  gridTemplateColumns: "auto 1fr auto",
  gap: 8,
  p: 8,
  items: "center",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",

  variants: {
    expanded: {
      true: { fontWeight: 600 },
    },
  },

  defaultVariants: {
    expanded: false,
  },
});
const NoteNodeRoot = styled(s.div, {
  r: 8,
  d: "grid",
  gap: 8,
  gridTemplateColumns: "1fr auto",
  items: "center",
  listStyle: "none",

  variants: {
    selected: {
      true: { bg: "$primaryTonal", color: "$onPrimaryTonal", fontWeight: 400 },
      false: { "&:hover": { bg: "$background3" } },
    },
    hide: { true: { visibility: "hidden" } },
  },

  defaultVariants: {
    hide: false,
    selected: false,
  },
});
const DropdownButton = styled(s.button, {
  h: "100%",
  w: 24,
  d: "flex",
  items: "center",
});

const SubDirectories = styled("div", {
  bl: "1px solid $outline2",
  ml: 14,
  pl: 6,
});
