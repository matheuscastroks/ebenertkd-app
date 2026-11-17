/** Preserve the first page session when installation claims an uncontrolled client. */
export function createControllerChangeHandler(initiallyControlled: boolean, reload: () => void) {
  let controlled = initiallyControlled;
  let refreshing = false;
  return () => {
    if (refreshing) return;
    if (!controlled) {
      controlled = true;
      return;
    }
    refreshing = true;
    reload();
  };
}
