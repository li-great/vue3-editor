import { computed, defineComponent, inject, ref } from "vue";
import "./editor.scss";
import EditorBlock from "./editor-block";
import deepcopy from "deepcopy";
import { useFocus } from "./useFocus";
import { useBlcokDragger } from "./useBlockDragger";
import { useMenuDragger } from "./useMenuDragger";
import { useCommand } from "./useCommand";
import { $dialog } from "../components/Dialog";
import { $dropdown, DropdownItem } from "../components/Dropdown";
import { ElButton } from "element-plus";
import EditorOperator from "./editor-operator";
export default defineComponent({
  props: {
    modelValue: { type: Object },
    formData: { type: Object },
  },
  emits: ["update:modelValue"],
  setup(props, ctx) {
    const previewRef = ref(false);
    const editorRef = ref(true);
    const data = computed({
      get() {
        return props.modelValue;
      },
      set(newValue) {
        ctx.emit("update:modelValue", deepcopy(newValue));
      },
    });
    const containerStyles = computed(() => ({
      width: data.value.container.width + "px",
      height: data.value.container.height + "px",
      margin: !editorRef.value && 0,
    }));
    const config = inject("config");

    const containerRef = ref(null);

    let { dragStart, dragEnd } = useMenuDragger(containerRef, data);

    let {
      blockMousedown,
      focusData,
      containerMousedown,
      lastSelectBlock,
      clearBlockFocus,
    } = useFocus(data, previewRef, (e) => {
      mousedown(e);
    });
    let { mousedown, markLine } = useBlcokDragger(
      focusData,
      lastSelectBlock,
      data
    );
    const { commands } = useCommand(data, focusData);
    const buttons = [
      { label: "撤销", icon: "icon-undo", handler: () => commands.undo() },
      { label: "重做", icon: "icon-redo", handler: () => commands.redo() },
      {
        label: "导出",
        icon: "icon-daochu",
        handler: () => {
          $dialog({
            title: "导出json使用",
            content: JSON.stringify(data.value),
          });
        },
      },
      {
        label: "导入",
        icon: "icon-daoru",
        handler: () => {
          $dialog({
            title: "导入json使用",
            content: "",
            footer: true,
            onConfirm(text) {
              commands.updateContainer(JSON.parse(text));
            },
          });
        },
      },
      {
        label: "置顶",
        icon: "icon-control-top",
        handler: () => commands.placeTop(),
      },
      {
        label: "置底",
        icon: "icon-control-bottom",
        handler: () => commands.placeBottom(),
      },
      {
        label: "删除",
        icon: "icon-shanchu",
        handler: () => commands.delete(),
      },
      {
        label: () => (previewRef.value ? "编辑" : "预览"),
        icon: () => (previewRef.value ? "icon-wenbenbianji" : "icon-yulan"),
        handler: () => {
          previewRef.value = !previewRef.value;
          clearBlockFocus();
        },
      },
      {
        label: "关闭",
        icon: "icon-guanbi",
        handler: () => {
          editorRef.value = false;
          clearBlockFocus();
        },
      },
    ];
    const onContextMenuBlock = (e, block) => {
      e.preventDefault();
      $dropdown({
        el: e.target,
        content: () => (
          <>
            <DropdownItem
              label="删除"
              icon="icon-shanchu"
              onClick={() => commands.delete()}></DropdownItem>
            <DropdownItem
              label="置顶"
              icon="icon-control-top"
              onClick={() => commands.placeTop()}></DropdownItem>
            <DropdownItem
              label="置底"
              icon="icon-control-bottom"
              onClick={() => commands.placeBottom()}></DropdownItem>
            <DropdownItem
              label="查看"
              icon="icon-yulan"
              onClick={() => {
                $dialog({
                  title: "查看节点数据",
                  content: JSON.stringify(block),
                });
              }}></DropdownItem>
            <DropdownItem
              label="导入"
              icon="icon-daoru"
              onClick={() => {
                $dialog({
                  title: "导入节点数据",
                  content: "",
                  footer: true,
                  onConfirm(text) {
                    text = JSON.parse(text);
                    commands.updateBlock(text, block);
                  },
                });
              }}></DropdownItem>
          </>
        ),
      });
    };

    return () =>
      !editorRef.value ? (
        <>
          <div
            class="editor-container-canvas_content"
            style={containerStyles.value}>
            {data.value.blocks.map((block, index) => (
              <EditorBlock
                class="editor-block-preview"
                block={block}
                formData={props.formData}></EditorBlock>
            ))}
          </div>
          <div>
            <ElButton type="primary" onClick={() => (editorRef.value = true)}>
              继续编辑
            </ElButton>
            {JSON.stringify(props.formData)}
          </div>
        </>
      ) : (
        <div class="editor">
          <div class="editor-left">
            {config.componentList.map((component) => (
              <div
                class="editor-left-item"
                draggable
                ondragstart={(e) => dragStart(e, component)}
                ondragend={dragEnd}>
                <span>{component.label}</span>
                <div>{component.preview()}</div>
              </div>
            ))}
          </div>
          <div class="editor-top">
            {buttons.map((btn, index) => {
              const icon =
                typeof btn.icon == "function" ? btn.icon() : btn.icon;
              const label =
                typeof btn.label == "function" ? btn.label() : btn.label;
              return (
                <div class="editor-top-button " onClick={btn.handler}>
                  <i class={icon}></i>
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
          <div class="editor-right">
            <EditorOperator
              block={lastSelectBlock.value}
              data={data.value}
              updateContainer={commands.updateContainer}
              updateBlock={commands.updateBlock}></EditorOperator>
          </div>
          <div class="editor-container">
            {/* 负责产生滚动条 */}
            <div class="editor-container-canvas">
              {/* 产生内容区域 */}
              <div
                class="editor-container-canvas_content"
                style={containerStyles.value}
                ref={containerRef}
                onmousedown={containerMousedown}>
                {data.value.blocks.map((block, index) => (
                  <EditorBlock
                    class={
                      block.focus
                        ? "editor-block-focus"
                        : previewRef.value
                        ? "editor-block-preview"
                        : ""
                    }
                    block={block}
                    onmousedown={(e) => blockMousedown(e, block, index)}
                    oncontextmenu={(e) => onContextMenuBlock(e, block)}
                    formData={props.formData}></EditorBlock>
                ))}
                {markLine.x !== null && (
                  <div class="line-x" style={{ left: markLine.x + "px" }}></div>
                )}
                {markLine.y !== null && (
                  <div class="line-y" style={{ top: markLine.y + "px" }}></div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
  },
});
