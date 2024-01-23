import { useNavigate } from "react-router-dom";
import { s, styled } from "style/stitches.config";
import {
  ReaderIcon,
  DragHandleDots2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@radix-ui/react-icons";
import { useNoteParams } from "route/notes/note/params";
import { useEffect, useState } from "react";
import { LoadingShim } from "component/ui/LoadingShim";
import { useNoteTreeQuery, writeNodeLinkToClipboard } from "api/tree";
import { TreeNode, NodeType } from "algorithm/tree";
import { invariant } from "exception/invariant";
import { DragOverlay, useDndContext } from "@dnd-kit/core";
import {
  useDraggableNode,
  useNodeCreate,
  useNodeDelete,
  useNoteTreeDrag,
  useTreeShortcuts,
} from "./hooks";
import { When } from "component/When";
import { DirectoryDropzone, NodeName } from "./components";
import { NodeContext } from "./context";
import { useTreeStore } from "./store";
import { usePaneManager } from "route/usePaneManager";

export function NoteTree({ width }: { width: number }) {
  const { load, tree } = useTreeStore();
  const { data, error, isLoading, isSuccess } = useNoteTreeQuery();
  const isInitialLoad = !tree.length && isLoading;
  useEffect(() => {
    if (isSuccess) {
      load(data);
    }
  }, [isSuccess, load, data]);

  useTreeShortcuts();

  const DragContext = useNoteTreeDrag();

  if (isInitialLoad) {
    // first load, no local state
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

  const { isSelected, select, toggleExpansion, isExpanded } = useTreeStore();

  const isNote = node.type === "note";
  const isDirectory = node.type === "directory";
  const isActive = noteKey === node.key;

  invariant(!isNote || !isDirectory, `Unknown node type: ${node}`);

  const [renaming, setRenaming] = useState(false);

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
    invariant(isNote, "Only notes can be copied");
    writeNodeLinkToClipboard(node);
  };

  const { selectSidebar } = usePaneManager();
  const handleExpand = () => {
    selectSidebar();
    toggleExpansion(node);
  };
  const handleSelect = () => {
    selectSidebar();
    select(node.key);
    if (isNote) {
      navigate(node.key);
    }
  };

  const Icon = getIcon(node.type, isExpanded(node));

  const row = (
    <>
      <NodeContext
        type={node.type}
        onRename={() => setRenaming(true)}
        onDelete={handleDelete}
        onCreateSubdirectory={handleDirectoryCreate}
        onCreateNote={handleNoteCreate}
        onCopyNodeLink={handleNodeCopyLink}
      >
        <NoteInner expanded={isExpanded(node)} onClick={handleSelect}>
          <Icon onClick={isNote ? handleSelect : handleExpand} />
          <NodeName
            renaming={renaming}
            onRenamingChange={setRenaming}
            node={node}
          />
        </NoteInner>
      </NodeContext>
      <DragHandle>
        <When
          condition={`${NoteNodeRoot}:hover &`}
          css={{ d: "flex", items: "center", justify: "center", p: 8 }}
        >
          <DragHandleDots2Icon />
        </When>
      </DragHandle>
    </>
  );

  const id = "node-" + node.key;
  const nodeProps = {
    id,
    selected: isSelected(node),
    open: isActive,
    hide: isDragging,
  };

  if (isNote) {
    return (
      <NoteNodeRoot ref={ref} {...nodeProps}>
        {row}
      </NoteNodeRoot>
    );
  }

  return (
    <>
      <DirectoryDropzone directoryKey={node.key}>
        <NoteNodeRoot ref={ref} {...nodeProps}>
          {row}
        </NoteNodeRoot>
        {isExpanded(node) && (
          <>
            <SubDirectories>
              {node.children?.map((child) => (
                <NoteTreeNode key={child.key} node={child} />
              ))}
            </SubDirectories>
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

const NoteNodeRoot = styled(s.div, {
  r: 8,
  d: "grid",
  gap: 8,
  gridTemplateColumns: "1fr auto",
  items: "center",

  variants: {
    open: {
      true: { color: "$onPrimaryTonal" },
    },
    selected: {
      true: { bg: "$primaryTonal" },
      false: { "&:hover": { bg: "$background3" } },
    },
    hide: { true: { visibility: "hidden" } },
  },

  defaultVariants: {
    hide: false,
    selected: false,
  },
});
const NoteInner = styled(s.button, {
  all: "unset",
  d: "grid",
  gridTemplateColumns: "auto 1fr",
  w: "100%",
  gap: 8,
  p: 8,
  items: "center",

  variants: {
    expanded: {
      true: { fontWeight: 600 },
    },
  },

  defaultVariants: {
    expanded: false,
  },
});

const SubDirectories = styled("div", {
  bl: "1px solid $outline2",
  ml: 14,
  pl: 6,
});
