export const formatBytes = (bytes, decimals = 2, bandwidth = false, t = null) => {
  if (bytes === 0) return t ? `0 ${t('units.bytes')}` : '0 Bytes'

  let k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizeKeys = ['bytes', 'kb', 'mb', 'gb', 'tb', 'pb', 'eb', 'zb', 'yb']
  const bandwidthKeys = ['bps', 'kbps', 'mbps', 'gbps', 'tbps', 'pbps', 'ebps', 'zbps', 'ybps']

  // Fallback arrays for when translation function is not provided
  const fallbackSizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const fallbackBandwidthSizes = [
    'Bps',
    'Kbps',
    'Mbps',
    'Gbps',
    'Tbps',
    'Pbs',
    'Ebps',
    'Zbps',
    'Ybps'
  ]

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  if (bandwidth) {
    let k = 1000
    bytes = bytes * 8
    const unit = t ? t(`units.${bandwidthKeys[i]}`) : fallbackBandwidthSizes[i]
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + unit
  }
  const unit = t ? t(`units.${sizeKeys[i]}`) : fallbackSizes[i]
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + unit
}
