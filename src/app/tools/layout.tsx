import RelatedTools from "@/components/RelatedTools";

export default function ToolsLayout(props: LayoutProps<"/tools">) {
  return (
    <>
      {props.children}
      <RelatedTools />
    </>
  );
}
