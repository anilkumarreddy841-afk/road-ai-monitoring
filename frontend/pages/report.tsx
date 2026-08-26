import { useEffect, useState } from 'react'

export default function ReportPage() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [bluetoothDevice, setBluetoothDevice] = useState<any>(null)
  const [bluetoothMessage, setBluetoothMessage] = useState<string | null>(null)
  const [bluetoothLoading, setBluetoothLoading] = useState(false)

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => {
          setSubmissionMessage('Location access declined. Please allow GPS to attach coordinates.')
        },
      )
    }
  }, [])

  async function connectBluetooth() {
    if (!('bluetooth' in navigator)) {
      setBluetoothMessage('Bluetooth connection is not supported by this browser. Use Chrome or Edge on Android, served over HTTPS.')
      return
    }

    setBluetoothLoading(true)
    setBluetoothMessage(null)
    try {
      const device = await (navigator as any).bluetooth.requestDevice({ acceptAllDevices: true })
      if (device.gatt && !device.gatt.connected) await device.gatt.connect()
      device.addEventListener('gattserverdisconnected', () => {
        setBluetoothDevice(null)
        setBluetoothMessage('Bluetooth device disconnected.')
      })
      setBluetoothDevice(device)
      setBluetoothMessage(`Connected to ${device.name || 'nearby Bluetooth device'}. Its details will be attached to this report.`)
    } catch (error: any) {
      if (error?.name === 'NotFoundError') {
        setBluetoothMessage('No Bluetooth device was selected.')
      } else {
        setBluetoothMessage(error?.message || 'Unable to connect to the Bluetooth device.')
      }
    } finally {
      setBluetoothLoading(false)
    }
  }

  function disconnectBluetooth() {
    if (bluetoothDevice?.gatt?.connected) bluetoothDevice.gatt.disconnect()
    setBluetoothDevice(null)
    setBluetoothMessage('Bluetooth device disconnected.')
  }

  async function submit(e: any) {
    e.preventDefault()
    if (!coords) {
      return setSubmissionMessage('Waiting for GPS coordinates before submitting.')
    }

    const fd = new FormData()
    fd.append('title', title || `Road image report ${new Date().toLocaleString()}`)
    fd.append('description', description)
    fd.append('latitude', String(coords.lat))
    fd.append('longitude', String(coords.lng))
    if (bluetoothDevice) {
      fd.append('device_info', JSON.stringify({
        connection: 'bluetooth',
        name: bluetoothDevice.name || 'Unnamed Bluetooth device',
        id: bluetoothDevice.id || null,
        connected_at: new Date().toISOString(),
      }))
    }
    if (files) {
      Array.from(files).forEach((f) => fd.append('files', f))
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    setLoading(true)

    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/reports', {
        method: 'POST',
        headers: token ? { Authorization: 'Bearer ' + token } : {},
        body: fd,
      })
      if (res.ok) {
        setSubmissionMessage('Report submitted successfully. Thank you for improving road safety.')
        setTitle('')
        setDescription('')
        setFiles(null)
      } else {
        const err = await res.json().catch(() => null)
        setSubmissionMessage(err?.detail || 'Submit failed. Please try again.')
      }
    } catch (error: any) {
      setSubmissionMessage(error?.message || 'Submit failed due to network error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100 sm:px-10">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-xl shadow-slate-900/20">
        <h1 className="text-3xl font-semibold text-white">New Road Image & Video Report</h1>
        <p className="mt-3 text-slate-400">Upload a vehicle camera capture, dashcam video, or citizen-reported road scene media. The browser attaches GPS coordinates automatically so the backend can place damage on the map.</p>

        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-5 text-sm text-slate-300">
          <p className="font-semibold text-white">Suggested detection prompt</p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-200">
{`Build a world-class AI-Powered Smart Road Infrastructure Management System.
Analyze this road image and GPS location for automatic detection, monitoring, and management of road damage.
Detect and classify damage types: potholes, cracks, edge failures, broken roads, damaged bridges, uneven surfaces, missing road markings, waterlogging, faded markings, and other infrastructure problems.
Include automatic extraction of:
- GPS coordinates
- date and time
- road name
- district, city, state
- weather conditions
- device and vehicle information
- speed, direction, and timestamps
Classify every damage as Minor, Moderate, Major, or Critical with confidence scores.
Estimate damaged road parameters when available:
- length, width, depth
- damaged area in square meters
- total damaged percentage
- repair priority
- expected remaining road life
Generate a structured report with:
- Road ID
- Road Name
- GPS Location
- District
- Damage Type
- Damage Severity
- Damaged Length
- Damaged Width
- Total Area
- Materials Required
- Quantity of Materials
- Estimated Cost
- Contractor Assignment
- Expected Start Date
- Expected Completion Date
- Budget Approval Status
- Engineer Verification Status
Return JSON fields for:
- title
- description
- latitude
- longitude
- severity
- damage_type
- confidence
- damaged_length
- damaged_width
- damaged_area
- repair_priority
- estimated_cost
- predictions`}
          </pre>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <input
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-cyan-500"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="h-40 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-cyan-500"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-4 text-slate-300">
            <p className="font-semibold text-white">GPS location</p>
            <p className="mt-2 text-slate-200">
              {coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : 'Acquiring GPS from your device...'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-4 text-slate-300">
            <p className="font-semibold text-white">Bluetooth device</p>
            <p className="mt-2 text-sm text-slate-400">Pair a nearby Bluetooth-enabled phone, dashcam, or road sensor. Connection details are attached to this report.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {bluetoothDevice ? (
                <button type="button" onClick={disconnectBluetooth} className="rounded-2xl border border-rose-400/60 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-400/10">
                  Disconnect {bluetoothDevice.name || 'device'}
                </button>
              ) : (
                <button type="button" onClick={connectBluetooth} disabled={bluetoothLoading} className="rounded-2xl border border-cyan-400/60 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60">
                  {bluetoothLoading ? 'Connecting...' : 'Connect Bluetooth'}
                </button>
              )}
            </div>
            {bluetoothMessage ? <p className="mt-3 text-sm text-slate-300" role="status">{bluetoothMessage}</p> : null}
          </div>

          <label className="block text-sm text-slate-300">
            <span className="mb-2 block font-medium text-white">Upload image or video files</span>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
              onChange={(e) => setFiles(e.target.files)}
            />
          </label>

          {submissionMessage ? (
            <div className="rounded-3xl border border-slate-700 bg-slate-950/80 p-4 text-sm text-slate-200">
              {submissionMessage}
            </div>
          ) : null}

          <button className="w-full rounded-3xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400" disabled={loading}>
            {loading ? 'Submitting…' : 'Submit Road Image Report'}
          </button>
        </form>
      </div>
    </div>
  )
}
