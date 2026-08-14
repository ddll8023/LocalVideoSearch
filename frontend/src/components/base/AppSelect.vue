<template>
  <div ref="rootRef" class="relative">
    <button
      ref="buttonRef"
      type="button"
      class="inline-flex h-11 w-full items-center justify-between gap-3 rounded-md border border-zinc-300/80 bg-panel/95 px-3.5 text-left text-sm text-zinc-800 shadow-line outline-none transition duration-200 hover:border-primary-500/70 hover:bg-panel focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/25 disabled:cursor-not-allowed disabled:opacity-50"
      :aria-label="ariaLabel"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      :aria-controls="listboxId"
      :disabled="disabled"
      @click="toggleDropdown"
      @keydown="handleTriggerKeydown"
    >
      <span class="min-w-0 truncate">{{ selectedOption?.label || '' }}</span>
      <font-awesome-icon
        :icon="['fas', 'chevron-right']"
        class="shrink-0 text-xs text-zinc-500 transition duration-300"
        :class="{ 'rotate-90 text-primary-700': isOpen }"
        aria-hidden="true"
      />
    </button>

    <Transition name="select-menu">
      <div
        v-if="isOpen"
        :id="listboxId"
        class="absolute left-0 right-0 top-full z-[70] mt-1 max-h-60 overflow-y-auto rounded-md border border-zinc-200 bg-panel/98 p-1 shadow-lift backdrop-blur-xl"
        role="listbox"
        :aria-label="ariaLabel"
      >
        <button
          v-for="(option, index) in options"
          :id="optionId(index)"
          :key="String(option.value)"
          type="button"
          role="option"
          :aria-selected="isSelected(option)"
          class="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm transition duration-150 focus-visible:outline-none"
          :class="optionClasses(option, index)"
          @mousedown.prevent
          @click="selectOption(option)"
        >
          <font-awesome-icon
            v-if="isSelected(option)"
            :icon="['fas', 'circle-check']"
            class="shrink-0 text-primary-700"
            aria-hidden="true"
          />
          <span v-else class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span class="truncate">{{ option.label }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
/**
 * 自定义下拉选择器
 * 功能描述：提供统一的深色下拉面板、键盘导航和可访问状态
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

let instanceCount = 0

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  ariaLabel: { type: String, default: '选择选项' },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'change'])

const rootRef = ref(null)
const buttonRef = ref(null)
const isOpen = ref(false)
const activeIndex = ref(-1)
const instanceId = `app-select-${++instanceCount}`
const listboxId = `${instanceId}-listbox`

const valuesEqual = (left, right) => left === right || String(left) === String(right)

const selectedIndex = computed(() =>
  props.options.findIndex((option) => valuesEqual(option.value, props.modelValue))
)

const selectedOption = computed(() => props.options[selectedIndex.value] || props.options[0])

const optionId = (index) => `${instanceId}-option-${index}`

const isSelected = (option) => valuesEqual(option.value, props.modelValue)

const optionClasses = (option, index) => [
  isSelected(option)
    ? 'bg-primary-50 font-medium text-primary-700'
    : 'text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900',
  index === activeIndex.value ? 'ring-1 ring-inset ring-primary-500/50' : ''
]

const openDropdown = () => {
  if (props.disabled || !props.options.length) return
  activeIndex.value = selectedIndex.value >= 0 ? selectedIndex.value : 0
  isOpen.value = true
}

const closeDropdown = () => {
  isOpen.value = false
  activeIndex.value = -1
}

const toggleDropdown = () => {
  if (isOpen.value) {
    closeDropdown()
  } else {
    openDropdown()
  }
}

const moveActive = (step) => {
  if (!props.options.length) return
  const nextIndex = activeIndex.value < 0 ? selectedIndex.value : activeIndex.value
  activeIndex.value = (nextIndex + step + props.options.length) % props.options.length
}

const selectOption = (option) => {
  if (!valuesEqual(option.value, props.modelValue)) {
    emit('update:modelValue', option.value)
    emit('change', option.value)
  }
  closeDropdown()
  nextTick(() => buttonRef.value?.focus())
}

const handleTriggerKeydown = (event) => {
  if (props.disabled) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (!isOpen.value) openDropdown()
    else moveActive(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (!isOpen.value) openDropdown()
    else moveActive(-1)
  } else if (event.key === 'Home' && isOpen.value) {
    event.preventDefault()
    activeIndex.value = 0
  } else if (event.key === 'End' && isOpen.value) {
    event.preventDefault()
    activeIndex.value = props.options.length - 1
  } else if ((event.key === 'Enter' || event.key === ' ') && isOpen.value) {
    event.preventDefault()
    if (activeIndex.value >= 0) selectOption(props.options[activeIndex.value])
  } else if (event.key === 'Escape' && isOpen.value) {
    event.preventDefault()
    closeDropdown()
  }
}

const handleOutsidePointerdown = (event) => {
  if (isOpen.value && !rootRef.value?.contains(event.target)) closeDropdown()
}

const handleOutsideFocus = (event) => {
  if (isOpen.value && !rootRef.value?.contains(event.target)) closeDropdown()
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointerdown)
  document.addEventListener('focusin', handleOutsideFocus)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointerdown)
  document.removeEventListener('focusin', handleOutsideFocus)
})
</script>

<style scoped>
.select-menu-enter-active,
.select-menu-leave-active {
  transform-origin: top center;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.select-menu-enter-from,
.select-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
