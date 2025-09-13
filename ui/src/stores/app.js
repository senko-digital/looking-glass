import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { formatBytes } from '@/helper/unit'
import { useI18n } from 'vue-i18n'
export const useAppStore = defineStore('app', () => {
  const source = ref()
  const sessionId = ref()
  const connecting = ref(true)
  const config = ref()
  const drawerWidth = ref()
  const memoryUsage = ref()
  let timer = ''

  // Get translation function
  const { t } = useI18n({ useScope: 'global' })

  const handleResize = () => {
    let width = window.innerWidth
    if (width > 800) {
      drawerWidth.value = 800
    } else {
      drawerWidth.value = width
    }
  }
  window.addEventListener('resize', handleResize)
  handleResize()

  const reconnectEventSource = () => {
    clearTimeout(timer)
    setTimeout(() => {
      setupEventSource()
    }, 1000)
  }

  const setupEventSource = () => {
    connecting.value = true
    const eventSource = new EventSource('./session')
    eventSource.addEventListener('SessionId', (e) => {
      sessionId.value = e.data
      console.log('session', e.data)
    })

    eventSource.addEventListener('Config', (e) => {
      config.value = JSON.parse(e.data)

      connecting.value = false
    })
    eventSource.addEventListener('MemoryUsage', (e) => {
      memoryUsage.value = formatBytes(e.data, 2, false, t)
    })

    eventSource.onerror = function (e) {
      eventSource.close()
      connecting.value = true
      console.log('SSE disconnected')
      reconnectEventSource()
    }
    source.value = eventSource
  }

  setupEventSource()

  const requestMethod = (method, data = {}, signal = null) => {
    let axiosConfig = {
      timeout: 1000 * 120,
      headers: {
        session: sessionId.value
      }
    }

    if (signal != null) {
      axiosConfig.signal = signal
    }

    const _axios = axios.create(axiosConfig)

    return new Promise((resolve, reject) => {
      _axios
        .get('./method/' + method, { params: data })
        .then((response) => {
          if (response.data.success) {
            resolve(response.data)
            return
          }
          reject(response)
        })
        .catch((error) => {
          if (error.code == 'ERR_CANCELED') {
            reject(error)
            return
          }
          console.error(error)
          reject(error)
        })
    })
  }

  return {
    //vars
    source,
    sessionId,
    connecting,
    config,
    drawerWidth,
    memoryUsage,

    //methods
    requestMethod
  }
})
