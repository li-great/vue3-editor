import { computed, ref } from "vue";
export function useFocus(data, previewRef, callback) {
  const clearBlockFocus = () => {
    data.value.blocks.forEach((block) => (block.focus = false));
  };
  const selectIndex = ref(-1);
  const lastSelectBlock = computed(() => data.value.blocks[selectIndex.value]);
  const focusData = computed(() => {
    let focus = [];
    let unfocused = [];
    data.value.blocks.forEach((block) =>
      (block.focus ? focus : unfocused).push(block)
    );
    return {
      focus,
      unfocused,
    };
  });
  const containerMousedown = () => {
    if (previewRef.value) return;
    clearBlockFocus();
    selectIndex.value = -1;
  };
  const blockMousedown = (e, block, index) => {
    if (previewRef.value) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.shiftKey) {
      if (focusData.value.focus.length <= 1) {
        block.focus = true;
      } else {
        block.focus = !block.focus;
      }
    } else {
      if (!block.focus) {
        clearBlockFocus();
        block.focus = true;
      }
    }
    selectIndex.value = index;
    callback(e);
  };

  return {
    blockMousedown,
    focusData,
    containerMousedown,
    lastSelectBlock,
    clearBlockFocus,
  };
}
