<template>
  <a-popover v-model:popup-visible="popupVisible" trigger="click">
    <a-input
      placeholder="请选择图标"
      :model-value="modelValue"
      allow-clear
      readonly
      @clear="emit('update:modelValue', '')"
    >
      <template #prefix>
        <GiSvgIcon v-if="modelValue" :size="16" :name="modelValue" />
        <icon-search v-else />
      </template>
    </a-input>

    <template #content>
      <div class="container" :class="{ 'is-list': !isGridView }">
        <a-row align="center">
          <section class="search-input">
            <a-input
              v-model="searchValue"
              placeholder="搜索 MDI 图标名称"
              allow-clear
              size="small"
            >
              <template #prefix>
                <icon-search />
              </template>
            </a-input>
          </section>

          <a-button size="small" title="切换图标布局" @click="isGridView = !isGridView">
            <template #icon>
              <icon-apps v-if="isGridView" />
              <icon-unordered-list v-else />
            </template>
          </a-button>
        </a-row>

        <a-spin :loading="isLoading">
          <section class="icon-list">
            <a-row v-if="currentPageIconList.length" wrap :gutter="4">
              <a-col v-for="item of currentPageIconList" :key="item" :span="isGridView ? 4 : 8">
                <button
                  type="button"
                  class="icon-item"
                  :class="{ active: modelValue === item }"
                  :aria-label="item"
                  :title="item"
                  @click="handleSelectedIcon(item)"
                >
                  <IconifyIcon :icon="item" :width="20" :height="20" aria-hidden="true" />
                  <div class="gi_line_1 icon-name">{{ item }}</div>
                </button>
              </a-col>
            </a-row>
            <a-empty v-else-if="iconList.length && !filteredIconList.length" />
          </section>
        </a-spin>

        <a-row v-if="total" justify="center" align="center">
          <a-pagination
            :current="current"
            size="mini"
            :page-size="pageSize"
            :total="total"
            :show-size-changer="false"
            @change="onPageChange"
          />
        </a-row>
        <div v-if="iconList.length" class="icon-count">共 {{ iconList.length.toLocaleString() }} 个图标</div>
      </div>
    </template>
  </a-popover>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import { useClipboard } from '@vueuse/core'
import { Icon as IconifyIcon } from '@iconify/vue'
import { loadMdiIconNames } from '@/utils/iconify'

defineOptions({ name: 'GiIconSelector' })

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  enableCopy: false,
})

const emit = defineEmits(['select', 'update:modelValue'])

interface Props {
  modelValue?: string
  enableCopy?: boolean
}

const popupVisible = ref(false)
const searchValue = ref('')
const isGridView = ref(false)
const isLoading = ref(false)
const iconList = ref<string[]>([])
const current = ref(1)
const pageSize = 42

const filteredIconList = computed(() => {
  const keyword = searchValue.value.trim().toLowerCase().replace(/^mdi:/, '')
  if (!keyword) return iconList.value
  return iconList.value.filter((icon) => icon.slice(4).toLowerCase().includes(keyword))
})

const total = computed(() => filteredIconList.value.length)
const currentPageIconList = computed(() => {
  const start = (current.value - 1) * pageSize
  return filteredIconList.value.slice(start, start + pageSize)
})

watch(searchValue, () => {
  current.value = 1
})

watch(popupVisible, async (visible) => {
  if (!visible || iconList.value.length || isLoading.value) return
  isLoading.value = true
  try {
    iconList.value = await loadMdiIconNames()
  } catch {
    Message.error('MDI 图标集加载失败')
  } finally {
    isLoading.value = false
  }
})

const onPageChange = (page: number) => {
  current.value = page
}

const handleSelectedIcon = async (icon: string) => {
  emit('select', icon)
  emit('update:modelValue', icon)
  popupVisible.value = false
  if (props.enableCopy) {
    const { isSupported, copy } = useClipboard()
    if (isSupported) {
      await copy(`<Icon icon="${icon}" />`)
      Message.success(`已选择并复制 ${icon}`)
    }
  }
}
</script>

<style scoped lang="scss">
.container {
  width: 320px;
  max-width: calc(100vw - 48px);
  overflow: hidden;

  .search-input {
    flex: 1;
    margin-right: 8px;
  }

  .icon-list {
    height: 300px;
    margin-top: 10px;
    margin-bottom: 10px;
    overflow: auto;

    .icon-item {
      display: flex;
      width: 100%;
      height: 38px;
      margin-bottom: 4px;
      padding: 0;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      cursor: pointer;
      border: 1px dashed var(--color-bg-1);
      background: transparent;
      color: var(--color-text-1);

      .icon-name {
        display: none;
      }

      &.active {
        border-color: rgb(var(--primary-3));
        background-color: rgba(var(--primary-6), 0.05);
      }

      &:not(.active):hover {
        border-color: var(--color-border-3);
      }

      &:focus-visible {
        outline: 2px solid rgb(var(--primary-6));
        outline-offset: -2px;
      }
    }
  }

  .icon-count {
    margin-top: 6px;
    color: var(--color-text-3);
    font-size: 12px;
    text-align: center;
  }
}

.is-list {
  min-width: 400px;

  .icon-list {
    .icon-item {
      justify-content: flex-start;
      padding-left: 8px;

      .icon-name {
        display: block;
        margin-left: 6px;
        color: var(--color-text-2);
        font-size: 12px;
        text-align: left;
      }
    }
  }
}
</style>
