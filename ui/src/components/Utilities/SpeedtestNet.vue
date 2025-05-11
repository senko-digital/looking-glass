<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { formatBytes } from '@/helper/unit'

let abortController = markRaw(new AbortController())

const appStore = useAppStore()
const working = ref(false)
const serverId = ref()
const isCrash = ref(false)
const isQueue = ref(false)
const isSpeedtest = ref(false)
const action = ref('')
const queueStat = ref({
  pos: 0,
  total: 0
})
const progress = ref({
  sub: 0,
  full: 0
})

const speedtestData = ref({
  ping: '0',
  download: '',
  upload: '',
  result: '',
  serverInfo: {
    id: '',
    name: '',
    pos: ''
  }
})

const steps = ref({
  start: false,
  ping: false,
  download: false,
  upload: false,
  end: false
})

const handleMessage = (e) => {
  const data = JSON.parse(e.data)
  console.log(data)
  switch (data.type) {
    case 'queue':
      isQueue.value = true
      queueStat.value.pos = data.pos
      queueStat.value.total = data.totalPos
      console.log(queueStat)
      break
    case 'testStart':
      isQueue.value = false
      isSpeedtest.value = true
      steps.value.start = true
      speedtestData.value.serverInfo.id = data.server.id
      speedtestData.value.serverInfo.name = data.server.name
      speedtestData.value.serverInfo.pos = data.server.country + ' - ' + data.server.location
      break
    case 'ping':
      action.value = 'Latency Test'
      speedtestData.value.ping = data.ping.latency
      break
    case 'download':
      action.value = 'Download Test'
      speedtestData.value.download = formatBytes(data.download.bandwidth, 2, true)
      progress.value.sub = Math.round(data.download.progress * 100)
      progress.value.full = Math.round(progress.value.sub / 2)
      break
    case 'upload':
      action.value = 'Upload Test'
      speedtestData.value.upload = formatBytes(data.upload.bandwidth, 2, true)
      progress.value.sub = Math.round(data.upload.progress * 100)
      progress.value.full = 50 + Math.round(progress.value.sub / 2)
      break
    case 'result':
      speedtestData.value.result = data.result.url
      speedtestData.value.download = formatBytes(data.download.bandwidth, 2, true)
      speedtestData.value.upload = formatBytes(data.upload.bandwidth, 2, true)
      break
  }
}

const stopTest = () => {
  abortController.abort('')
  appStore.source.removeEventListener('SpeedtestStream', handleMessage)
  isSpeedtest.value = false
}

const speedtest = async () => {
  if (working.value) return false
  abortController = new AbortController()
  working.value = true
  isSpeedtest.value = true
  action.value = ''
  isCrash.value = false
  progress.value = {
    sub: 0,
    full: 0
  }
  speedtestData.value = {
    ping: '0',
    download: '',
    upload: '',
    result: '',
    serverInfo: {
      id: '',
      name: '',
      pos: ''
    }
  }
  appStore.source.addEventListener('SpeedtestStream', handleMessage)
  try {
    await appStore.requestMethod(
      'speedtest_dot_net',
      { node_id: serverId.value },
      abortController.signal
    )
  } catch (e) {}
  appStore.source.removeEventListener('SpeedtestStream', handleMessage)
  working.value = false
}

onUnmounted(() => {
  stopTest()
})
</script>

<template>
  <n-space vertical>
    <n-input-group>
      <n-input
        :disabled="working"
        v-model:value="serverId"
        :style="{ width: '90%' }"
        placeholder="speedtest.net server ID (optional)"
        @keyup.enter="speedtest"
      />
      <n-button :loading="working" type="primary" ghost @click="speedtest()"> Run </n-button>
    </n-input-group>
    <n-collapse-transition :show="isQueue">
      <n-spin>
        <n-alert :show-icon="false" :bordered="false">
          <br />
          <br />
        </n-alert>
        <template #description>
          Speed test request is in the queue, currently you are in the {{ queueStat.pos }} position
          (total {{ queueStat.total }} positions)
        </template>
      </n-spin>
    </n-collapse-transition>

    <n-collapse-transition :show="!isQueue && isSpeedtest && action == '' && !isCrash">
      <n-alert :show-icon="false" :bordered="false">Test will start soon... </n-alert>
    </n-collapse-transition>
    <n-collapse-transition :show="speedtestData.result != ''">
      <n-alert :show-icon="false" :bordered="false">
        <a :href="speedtestData.result" target="_blank">
          <img
            :src="speedtestData.result + '.png'"
            style="max-width: 300px; height: 100%; display: flex; margin: auto"
          />
        </a>
      </n-alert>
    </n-collapse-transition>
    <n-collapse-transition :show="isSpeedtest && action != ''">
      <n-collapse-transition :show="working">
        <p>
          {{ action }} - Progress
          <span style="float: right">{{ progress.sub }}%</span>
        </p>
        <n-progress
          type="line"
          :percentage="progress.sub"
          :show-indicator="false"
          :processing="working"
        />
        <p>
          Total Progress <span style="float: right">{{ progress.full }}%</span>
        </p>
        <n-progress
          type="line"
          :percentage="progress.full"
          :show-indicator="false"
          :processing="working"
        />
      </n-collapse-transition>
      <n-collapse-transition :show="isSpeedtest && speedtestData.serverInfo.id != ''">
        <n-divider v-if="working" />
        <n-table :bordered="true" :single-line="false">
          <tbody>
            <tr>
              <td>Server ID</td>
              <td>{{ speedtestData.serverInfo.id }}</td>
            </tr>
            <tr>
              <td>Server Location</td>
              <td>{{ speedtestData.serverInfo.pos }}</td>
            </tr>
            <tr>
              <td>Server Name</td>
              <td>{{ speedtestData.serverInfo.name }}</td>
            </tr>
          </tbody>
        </n-table>
      </n-collapse-transition>

      <n-collapse-transition :show="isSpeedtest && speedtestData.ping != '0'">
        <n-divider />
        <n-table :bordered="true" :single-line="false">
          <tbody>
            <tr>
              <td>Latency</td>
              <td v-if="speedtestData.ping == '0'">Waiting for start</td>
              <td v-else>{{ speedtestData.ping }} ms</td>
            </tr>
            <tr>
              <td>Download Speed</td>
              <td v-if="speedtestData.download == ''">Waiting for start</td>
              <td v-else>{{ speedtestData.download }}</td>
            </tr>
            <tr>
              <td>Upload Speed</td>
              <td v-if="speedtestData.upload == ''">Waiting for start</td>
              <td v-else>{{ speedtestData.upload }}</td>
            </tr>
          </tbody>
        </n-table>
      </n-collapse-transition>
    </n-collapse-transition>
  </n-space>
</template>
