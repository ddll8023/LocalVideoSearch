import { library } from '@fortawesome/fontawesome-svg-core'
import { faHeart as farHeart } from '@fortawesome/free-regular-svg-icons'
import {
  faArrowLeft,
  faBan,
  faChartLine,
  faChevronLeft,
  faChevronRight,
  faCircleCheck,
  faCircleInfo,
  faClapperboard,
  faClockRotateLeft,
  faCopy,
  faDownload,
  faFileExport,
  faFileImport,
  faFilm,
  faFilter,
  faFlask,
  faForwardStep,
  faGear,
  faHeart,
  faHouse,
  faLayerGroup,
  faList,
  faMagnifyingGlass,
  faMinus,
  faPause,
  faPen,
  faPlay,
  faPlus,
  faRotate,
  faServer,
  faSpinner,
  faSquare,
  faTrash,
  faTriangleExclamation,
  faTv,
  faVideo,
  faWindowRestore,
  faXmark
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import './assets/styles/main.css'

library.add(
  faArrowLeft,
  faBan,
  faChartLine,
  faChevronLeft,
  faChevronRight,
  faCircleCheck,
  faCircleInfo,
  faClapperboard,
  faClockRotateLeft,
  faCopy,
  faDownload,
  faFileExport,
  faFileImport,
  faFilm,
  faFilter,
  faFlask,
  faForwardStep,
  faGear,
  faHeart,
  farHeart,
  faHouse,
  faLayerGroup,
  faList,
  faMagnifyingGlass,
  faMinus,
  faPause,
  faPen,
  faPlay,
  faPlus,
  faRotate,
  faServer,
  faSpinner,
  faSquare,
  faTrash,
  faTriangleExclamation,
  faTv,
  faVideo,
  faWindowRestore,
  faXmark
)

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.component('font-awesome-icon', FontAwesomeIcon)

app.mount('#app')
