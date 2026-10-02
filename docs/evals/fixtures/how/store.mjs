export function saveOnce(store, item) {
  if (store.has(item.id)) return { status: 200, created: false, item: store.get(item.id) };
  store.set(item.id, item);
  return { status: 201, created: true, item };
}
