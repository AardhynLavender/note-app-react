import { styled } from "style/stitches.config";
import { Outlet } from "react-router-dom";
import { Sidebar } from "../sidebar";
import { hideScrollbar } from "style/util";
import { OpenSidebar } from "../OpenSidebar";

export default function NotesLayout() {
  return (
    <Root>
      <Sidebar />
      <Main>
        <OpenSidebar showFrom="sm" />
        <Outlet />
      </Main>
    </Root>
  );
}

const Root = styled("div", {
  d: "grid",
  gtc: "auto 1fr",

  w: "100%",
  h: "100%",

  overflowX: "auto",
  scrollSnapType: "x mandatory",
  scrollBehavior: "smooth",
  "&>*": { scrollSnapAlign: "start" },

  ...hideScrollbar,
});
const Main = styled("section", {
  pos: "relative",
  w: "100vw",
  "@sm": { w: "100%" },
});
