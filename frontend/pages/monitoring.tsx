import Head from 'next/head'
import { useEffect, useMemo, useRef, useState } from 'react'

type Inspection = {
  id: number; captured_at: string; damage_percentage: number; severity: string; condition_change: number
  status: string; requires_human_verification: boolean; alert_reason?: string
  detections: Record<string, number>; video_filename?: string
  project: { project_id: string; road_name: string; contractor_name: string; latitude: number; longitude: number; completion_date: string; maintenance_end_date: string; baseline_damage_percentage: number }
}

type LiveAnalysis = {
  totalDamage: number
  damagePercentage?: number
  severity?: string
  detections: { type: string; count: number; confidence?: number }[]
  message?: string
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const demo: Inspection[] = [
  { id: 1, captured_at: '2026-08-24T09:30:00', damage_percentage: 28, severity: 'Severe', condition_change: 24, status: 'CONTRACTOR PERFORMANCE ALERT', requires_human_verification: true, detections: { Potholes: 6, Cracks: 14, Waterlogging: 1 }, video_filename: 'MH-12_ward-7_0824.mp4', project: { project_id: 'RDM-2025-084', road_name: 'Airport Link Road · Ward 7', contractor_name: 'Apex Infra Projects Ltd.', latitude: 18.5621, longitude: 73.9178, completion_date: '2025-11-12', maintenance_end_date: '2028-11-12', baseline_damage_percentage: 4 } },
  { id: 2, captured_at: '2026-08-23T14:12:00', damage_percentage: 8, severity: 'Minor', condition_change: 5, status: 'Monitoring', requires_human_verification: false, detections: { Cracks: 5, 'Surface wear': 3 }, video_filename: 'NH-60_section-b.mp4', project: { project_id: 'RDM-2024-216', road_name: 'University Road · Section B', contractor_name: 'CivicWorks Engineering', latitude: 18.5283, longitude: 73.8521, completion_date: '2024-07-18', maintenance_end_date: '2027-07-18', baseline_damage_percentage: 3 } },
  { id: 3, captured_at: '2026-08-22T11:08:00', damage_percentage: 2, severity: 'Healthy', condition_change: 1, status: 'Monitoring', requires_human_verification: false, detections: { 'Surface wear': 1 }, project: { project_id: 'RDM-2025-041', road_name: 'Riverside Avenue', contractor_name: 'Metro Roadworks', latitude: 18.5047, longitude: 73.8142, completion_date: '2025-09-04', maintenance_end_date: '2028-09-04', baseline_damage_percentage: 1 } },
]

function severityClass(severity: string) {
  const s = severity.toLowerCase()
  if (['severe', 'critical', 'major'].includes(s)) return 'bg-rose-500/15 text-rose-300 ring-rose-400/20'
  if (['minor', 'moderate'].includes(s)) return 'bg-amber-500/15 text-amber-200 ring-amber-400/20'
  return 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/20'
}

export default function Monitoring() {
  const [inspections, setInspections] = useState<Inspection[]>(demo)
  const [usingDemo, setUsingDemo] = useState(true)
  const [selected, setSelected] = useState<Inspection>(demo[0])
  const [filter, setFilter] = useState('All conditions')
  const [notice, setNotice] = useState<string | null>(null)
  const [cameraMessage, setCameraMessage] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [analysingFrame, setAnalysingFrame] = useState(false)
  const [liveAnalysis, setLiveAnalysis] = useState<LiveAnalysis | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    fetch(`${apiUrl}/api/monitoring/dashboard`).then(r => r.ok ? r.json() : Promise.reject()).then(data => {
      if (data.inspections?.length) { setInspections(data.inspections); setSelected(data.inspections[0]); setUsingDemo(false) }
    }).catch(() => undefined)
  }, [])

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(track => track.stop())
  }, [])

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMessage('Live camera is not available in this browser. Open the app over HTTPS and allow camera access.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraActive(true)
      setCameraMessage('Live road camera is on. Point it at the road, then analyze a frame.')
    } catch (error: any) {
      setCameraMessage(error?.name === 'NotAllowedError' ? 'Camera access was denied. Allow it in your browser settings and try again.' : error?.message || 'Could not open the camera.')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraActive(false)
  }

  async function analyseLiveFrame() {
    const video = videoRef.current
    const token = localStorage.getItem('token')
    if (!video || !cameraActive || !video.videoWidth) return setCameraMessage('Start the live camera and wait for the video preview before analyzing.')
    if (!token) return setCameraMessage('Please log in before submitting a live road analysis.')

    setAnalysingFrame(true)
    setCameraMessage('Capturing and analyzing the current road frame…')
    try {
      const location = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 }))
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d')?.drawImage(video, 0, 0)
      const image = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not capture camera frame.')), 'image/jpeg', 0.9))
      const form = new FormData()
      form.append('title', `Live road camera inspection ${new Date().toLocaleString()}`)
      form.append('description', 'Frame captured from live road monitoring camera.')
      form.append('latitude', String(location.coords.latitude))
      form.append('longitude', String(location.coords.longitude))
      form.append('report_source', 'live_camera')
      form.append('device_info', JSON.stringify({ source: 'live_camera', captured_at: new Date().toISOString() }))
      form.append('files', new File([image], 'live-road-frame.jpg', { type: 'image/jpeg' }))
      const response = await fetch(`${apiUrl}/api/reports`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.detail || 'Live frame analysis failed.')
      const prediction = data?.predictions?.predictions?.[0] || data?.predictions?.[0] || data?.predictions || {}
      const grouped = (prediction.detections || []).reduce((result: Record<string, { type: string; count: number; confidence?: number }>, item: any) => {
        const type = item.type || 'Road damage'; result[type] = { type, count: (result[type]?.count || 0) + 1, confidence: item.confidence }; return result
      }, {})
      const detections = Object.values(grouped) as LiveAnalysis['detections']
      setLiveAnalysis({ totalDamage: detections.reduce((sum, item) => sum + item.count, 0), damagePercentage: prediction.damage_percentage, severity: prediction.severity || data?.severity, detections, message: prediction.message })
      setCameraMessage('Frame analyzed and saved to the road-report system.')
    } catch (error: any) {
      setCameraMessage(error?.code === 1 ? 'Location access is required to analyze and map the live road frame.' : error?.message || 'Live frame analysis failed.')
    } finally {
      setAnalysingFrame(false)
    }
  }

  const counts = useMemo(() => ({
    total: inspections.length || 0,
    healthy: inspections.filter(x => ['healthy', 'none'].includes(x.severity.toLowerCase())).length,
    minor: inspections.filter(x => ['minor', 'moderate'].includes(x.severity.toLowerCase())).length,
    severe: inspections.filter(x => ['severe', 'critical', 'major'].includes(x.severity.toLowerCase())).length,
    alerts: new Set(inspections.filter(x => x.status === 'CONTRACTOR PERFORMANCE ALERT').map(x => x.project.contractor_name)).size,
  }), [inspections])
  const filtered = filter === 'All conditions' ? inspections : inspections.filter(x => x.severity.toLowerCase() === filter.toLowerCase())
  const downloadReport = () => {
    const report = `ROAD DAMAGE INSPECTION ALERT\n\nProject: ${selected.project.project_id}\nRoad: ${selected.project.road_name}\nContractor: ${selected.project.contractor_name}\nCaptured: ${new Date(selected.captured_at).toLocaleString()}\nGPS: ${selected.project.latitude}, ${selected.project.longitude}\nCurrent damage: ${selected.damage_percentage}%\nChange from completion baseline: +${selected.condition_change}%\nAI status: ${selected.status}\n\n${selected.alert_reason || 'No alert has been raised for this inspection.'}\n\nThis AI result is an inspection alert only. Human verification is required before a legal or contractual decision.`
    const url = URL.createObjectURL(new Blob([report], { type: 'text/plain' })); const a = document.createElement('a'); a.href = url; a.download = `${selected.project.project_id}-inspection.txt`; a.click(); URL.revokeObjectURL(url)
    setNotice('Inspection report downloaded.')
  }

  return <div className="min-h-screen bg-[#08111f] text-slate-100">
    <Head><title>Road Damage Monitoring | SmartRoads</title></Head>
    <header className="border-b border-slate-800 bg-[#0b1628]/95 px-5 py-4 backdrop-blur sm:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400 text-xl text-slate-950">⌁</div><div><p className="text-xs font-semibold uppercase tracking-[.22em] text-cyan-300">SmartRoads</p><p className="font-semibold text-white">Road Damage Monitoring</p></div></div>
        <div className="flex items-center gap-3 text-sm"><span className="hidden text-slate-400 sm:inline">Operations Command Center</span><span className="rounded-full bg-emerald-400/10 px-3 py-1.5 font-medium text-emerald-300 ring-1 ring-emerald-400/20">● System online</span></div>
      </div>
    </header>
    <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="text-sm font-medium text-cyan-300">Infrastructure quality assurance</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Contractor accountability, backed by evidence.</h1><p className="mt-3 max-w-3xl text-slate-400">Track geo-tagged road video inspections, compare conditions after construction, and route high-risk findings to authorities for human review.</p></div><div className="flex gap-3"><a href="/report" className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300">+ Upload road video</a><button onClick={downloadReport} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800">Download report</button></div></div>
      <section className="mt-7 overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#0d1a2d]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 p-5">
          <div><p className="text-sm font-medium text-cyan-300">Live road camera</p><h2 className="mt-1 text-xl font-semibold text-white">Capture a road frame and count detected damage</h2><p className="mt-2 max-w-2xl text-sm text-slate-400">Use your phone or computer camera to view the road live. Each analysis captures one frame, saves it with GPS, and sends it to the configured AI service.</p></div>
          <div className="flex gap-3"><button onClick={cameraActive ? stopCamera : startCamera} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${cameraActive ? 'border border-rose-400/60 text-rose-200 hover:bg-rose-400/10' : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'}`}>{cameraActive ? 'Stop camera' : 'Open live camera'}</button>{cameraActive && <button onClick={analyseLiveFrame} disabled={analysingFrame} className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60">{analysingFrame ? 'Analyzing…' : 'Analyze current frame'}</button>}</div>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-[1.25fr_.75fr]">
          <div className="relative min-h-[260px] overflow-hidden rounded-xl bg-slate-950"><video ref={videoRef} muted playsInline className="h-full min-h-[260px] w-full object-cover" />{!cameraActive && <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-slate-500">Open the live camera to preview the road here.</div>} {cameraActive && <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-slate-950/75 px-3 py-1.5 text-xs font-medium text-rose-200"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" /> LIVE</div>}</div>
          <div className="rounded-xl border border-slate-700 bg-[#08111f] p-5"><p className="text-xs font-medium uppercase tracking-[.16em] text-slate-500">Current-frame damage</p>{liveAnalysis ? <><p className="mt-3 text-4xl font-semibold text-white">{liveAnalysis.totalDamage}</p><p className="mt-1 text-sm text-slate-400">detected damage item{liveAnalysis.totalDamage === 1 ? '' : 's'}</p><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-lg bg-slate-800 p-3"><p className="text-xs text-slate-500">Damage area</p><p className="mt-1 font-semibold text-amber-200">{liveAnalysis.damagePercentage == null ? '—' : `${liveAnalysis.damagePercentage}%`}</p></div><div className="rounded-lg bg-slate-800 p-3"><p className="text-xs text-slate-500">Severity</p><p className="mt-1 font-semibold text-rose-200">{liveAnalysis.severity || 'Pending'}</p></div></div><div className="mt-4 flex flex-wrap gap-2">{liveAnalysis.detections.length ? liveAnalysis.detections.map(item => <span key={item.type} className="rounded-lg bg-cyan-400/10 px-2.5 py-1.5 text-xs text-cyan-100">{item.type}: {item.count}{item.confidence ? ` · ${Math.round(item.confidence * 100)}%` : ''}</span>) : <span className="text-sm text-slate-400">{liveAnalysis.message || 'The AI service did not return individual detections.'}</span>}</div></> : <p className="mt-4 text-sm leading-6 text-slate-400">No frame analyzed yet. Open the camera, point it at the road, and select <span className="font-medium text-slate-200">Analyze current frame</span>.</p>}</div>
        </div>
        {cameraMessage && <p className="mx-5 mb-5 rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-300" role="status">{cameraMessage}</p>}
      </section>
      {usingDemo && <div className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-100">Showing example monitoring data until project inspections are recorded through the API.</div>}
      {notice && <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{notice}</div>}
      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[
        ['Roads monitored', counts.total, 'Live portfolio', 'text-white'], ['Healthy roads', counts.healthy, 'No action required', 'text-emerald-300'], ['Minor damage', counts.minor, 'Monitor next survey', 'text-amber-200'], ['Severe damage', counts.severe, 'Priority inspection', 'text-rose-300'], ['Contractors with alerts', counts.alerts, 'Human review pending', 'text-orange-300'],
      ].map(([label, value, helper, color]) => <div key={String(label)} className="rounded-2xl border border-slate-800 bg-[#0d1a2d] p-5"><p className="text-xs font-medium uppercase tracking-[.16em] text-slate-500">{label}</p><p className={`mt-3 text-3xl font-semibold ${color}`}>{value}</p><p className="mt-2 text-xs text-slate-500">{helper}</p></div>)}</section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.85fr]">
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0d1a2d]"><div className="flex items-center justify-between border-b border-slate-800 p-5"><div><h2 className="font-semibold text-white">Live damage map</h2><p className="mt-1 text-sm text-slate-400">GPS-tagged inspection locations and severity</p></div><span className="text-xs text-slate-500">Pune monitoring zone</span></div><div className="relative h-[390px] overflow-hidden bg-[#102139]" style={{backgroundImage:'linear-gradient(30deg, transparent 47%, #1c3451 48%, #1c3451 52%, transparent 53%), linear-gradient(-25deg, transparent 47%, #1c3451 48%, #1c3451 52%, transparent 53%)', backgroundSize:'160px 120px'}}><div className="absolute inset-0 opacity-30" style={{backgroundImage:'radial-gradient(#31577d 1px, transparent 1px)', backgroundSize:'18px 18px'}} />{inspections.map((item, i) => <button key={item.id} onClick={() => setSelected(item)} className={`absolute grid h-10 w-10 place-items-center rounded-full border-4 border-[#102139] shadow-lg transition hover:scale-110 ${item.status.includes('ALERT') ? 'bg-rose-500' : item.severity.toLowerCase() === 'healthy' ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{left:`${30 + i * 25}%`, top:`${28 + (i % 2) * 34}%`}} title={item.project.road_name}>●</button>)}<div className="absolute bottom-4 left-4 rounded-lg bg-slate-950/80 p-3 text-xs text-slate-300 backdrop-blur"><p className="font-medium text-white">{selected.project.road_name}</p><p className="mt-1">{selected.project.latitude.toFixed(4)}, {selected.project.longitude.toFixed(4)}</p></div></div></div>
        <div className="rounded-2xl border border-slate-800 bg-[#0d1a2d] p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-white">Condition trend</h2><p className="mt-1 text-sm text-slate-400">Damage score after completion</p></div><span className="text-xs text-slate-500">Last 6 months</span></div><div className="mt-8 flex h-44 items-end gap-3 border-b border-l border-slate-700 px-4 pb-2">{[4,6,7,10,14,28].map((n,i)=><div key={i} className="flex flex-1 flex-col items-center gap-2"><div className={`w-full rounded-t-md ${i === 5 ? 'bg-rose-400' : 'bg-cyan-500/70'}`} style={{height:`${n*5}px`}}/><span className="text-[10px] text-slate-500">{['Mar','Apr','May','Jun','Jul','Aug'][i]}</span></div>)}</div><div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100"><span className="font-semibold">Threshold: 15% increase.</span> Any project still within warranty is escalated when its measured damage increase exceeds this threshold.</div></div>
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.85fr]">
        <div className="rounded-2xl border border-slate-800 bg-[#0d1a2d]"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5"><div><h2 className="font-semibold text-white">Latest video inspections</h2><p className="mt-1 text-sm text-slate-400">AI detections are an aid to inspection, not a final decision.</p></div><select value={filter} onChange={e=>setFilter(e.target.value)} className="rounded-lg border border-slate-700 bg-[#08111f] px-3 py-2 text-sm text-slate-200"><option>All conditions</option><option>Healthy</option><option>Minor</option><option>Severe</option></select></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4">Road & project</th><th className="px-4 py-4">Contractor</th><th className="px-4 py-4">AI condition</th><th className="px-4 py-4">Change</th><th className="px-4 py-4">Captured</th></tr></thead><tbody>{filtered.map(item=><tr onClick={()=>setSelected(item)} key={item.id} className="cursor-pointer border-t border-slate-800/80 hover:bg-slate-800/40"><td className="px-5 py-4"><p className="font-medium text-slate-100">{item.project.road_name}</p><p className="mt-1 text-xs text-cyan-300">{item.project.project_id}</p></td><td className="px-4 py-4 text-slate-300">{item.project.contractor_name}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${severityClass(item.severity)}`}>{item.severity}</span></td><td className="px-4 py-4 font-medium text-rose-300">+{item.condition_change}%</td><td className="px-4 py-4 text-slate-400">{new Date(item.captured_at).toLocaleDateString()}</td></tr>)}</tbody></table></div></div>
        <aside className="rounded-2xl border border-slate-800 bg-[#0d1a2d] p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-[.16em] text-slate-500">Selected inspection</p><h2 className="mt-2 font-semibold text-white">{selected.project.project_id}</h2></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${severityClass(selected.severity)}`}>{selected.severity}</span></div><div className="mt-5 rounded-xl border border-slate-700 bg-[#08111f] p-4"><p className="font-medium text-white">{selected.project.road_name}</p><p className="mt-1 text-sm text-slate-400">{selected.project.contractor_name}</p><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-slate-500">Completed</p><p className="mt-1 text-slate-200">{new Date(selected.project.completion_date).toLocaleDateString()}</p></div><div><p className="text-slate-500">Warranty ends</p><p className="mt-1 text-slate-200">{new Date(selected.project.maintenance_end_date).toLocaleDateString()}</p></div></div></div><div className="mt-5"><p className="text-xs font-medium uppercase tracking-[.16em] text-slate-500">Detected damage</p><div className="mt-3 flex flex-wrap gap-2">{Object.entries(selected.detections).map(([name,count])=><span key={name} className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200">{name} · {count}</span>)}</div></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-800/70 p-3"><p className="text-xs text-slate-500">Baseline</p><p className="mt-1 text-xl font-semibold text-slate-100">{selected.project.baseline_damage_percentage}%</p></div><div className="rounded-xl bg-rose-500/10 p-3"><p className="text-xs text-rose-200/70">Current damage</p><p className="mt-1 text-xl font-semibold text-rose-300">{selected.damage_percentage}%</p></div></div>{selected.requires_human_verification && <div className="mt-5 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100"><p className="font-semibold">⚠ Contractor Performance Alert</p><p className="mt-2 text-rose-100/80">{selected.alert_reason}</p><p className="mt-3 font-medium">Human verification required before any final legal or contractual action.</p></div>}</aside>
      </section>
    </main>
  </div>
}
