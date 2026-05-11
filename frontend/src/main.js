import { library } from '@fortawesome/fontawesome-svg-core'
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
  faFilm,
  faFlask,
  faGear,
  faHouse,
  faLayerGroup,
  faList,
  faMagnifyingGlass,
  faMinus,
  faPlay,
  faRotate,
  faServer,
  faSpinner,
  faSquare,
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
  faFilm,
  faFlask,
  faGear,
  faHouse,
  faLayerGroup,
  faList,
  faMagnifyingGlass,
  faMinus,
  faPlay,
  faRotate,
  faServer,
  faSpinner,
  faSquare,
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
