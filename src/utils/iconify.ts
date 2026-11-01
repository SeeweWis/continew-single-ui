import { addCollection } from '@iconify/vue'

let mdiIconNamesPromise: Promise<string[]> | undefined

export function loadMdiIconNames() {
  return (mdiIconNamesPromise ??= import('@iconify-json/mdi/icons.json').then(({ default: mdi }) => {
    addCollection(mdi)
    return [...Object.keys(mdi.icons), ...Object.keys(mdi.aliases ?? {})]
      .sort()
      .map((name) => `mdi:${name}`)
  }))
}
