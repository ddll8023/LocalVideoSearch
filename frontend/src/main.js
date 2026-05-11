import { library } from '@fortawesome/fontawesome-svg-core'
import {
  faChartLine,
  faCircleInfo,
  faClockRotateLeft,
  faGear,
  faHouse,
  faList,
  faMagnifyingGlass,
  faPlay,
  faRotate,
  faServer,
  faVideo
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import './assets/styles/main.css'

library.add(
  faChartLine,
  faCircleInfo,
  faClockRotateLeft,
  faGear,
  faHouse,
  faList,
  faMagnifyingGlass,
  faPlay,
  faRotate,
  faServer,
  faVideo
)

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.component('font-awesome-icon', FontAwesomeIcon)

app.mount('#app')

