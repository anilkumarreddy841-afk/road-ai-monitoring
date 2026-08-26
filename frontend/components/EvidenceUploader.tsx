import { useState, useRef } from 'react'

interface EvidenceUploaderProps {
  onSubmit: (data: {
    completion_report: string
    photos: File[]
    video: File | null
  }) => Promise<void>
  loading?: boolean
}

export default function EvidenceUploader({ onSubmit, loading = false }: EvidenceUploaderProps) {
  const [completionReport, setCompletionReport] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [video, setVideo] = useState<File | null>(null)
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const photoInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setPhotos(files)
    const previews = files.map((f) => URL.createObjectURL(f))
    setPhotoPreviews(previews)
    setError(null)
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setVideo(file)
    if (file) {
      setVideoPreview(URL.createObjectURL(file))
    } else {
      setVideoPreview(null)
    }
    setError(null)
  }

  const removePhoto = (index: number) => {
    const newPhotos = [...photos]
    const newPreviews = [...photoPreviews]
    URL.revokeObjectURL(newPreviews[index])
    newPhotos.splice(index, 1)
    newPreviews.splice(index, 1)
    setPhotos(newPhotos)
    setPhotoPreviews(newPreviews)
  }

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview)
    setVideo(null)
    setVideoPreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (photos.length === 0 && !video) {
      setError('Please upload at least one photo or a video as evidence.')
      return
    }
    if (!completionReport.trim()) {
      setError('Please provide a completion report.')
      return
    }
    setError(null)
    await onSubmit({ completion_report: completionReport, photos, video })
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-white mb-2">Completion Report</label>
        <textarea
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-cyan-500 resize-none h-32"
          placeholder="Describe the repair work completed, materials used, and any observations..."
          value={completionReport}
          onChange={(e) => setCompletionReport(e.target.value)}
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">Repair Completion Photos</label>
        <input
          type="file"
          accept="image/*"
          multiple
          ref={photoInputRef}
          onChange={handlePhotoChange}
          className="hidden"
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          disabled={loading}
          className="rounded-2xl border border-cyan-400/60 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Select Photos
        </button>
        <p className="mt-2 text-xs text-slate-500">{photos.length} photo(s) selected</p>

        {photoPreviews.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {photoPreviews.map((preview, index) => (
              <div key={index} className="relative group">
                <img src={preview} alt={`Photo ${index + 1}`} className="h-24 w-full rounded-xl object-cover border border-slate-700" />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 rounded-full bg-rose-500/80 p-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">Repair Completion Video</label>
        <input
          type="file"
          accept="video/*"
          ref={videoInputRef}
          onChange={handleVideoChange}
          className="hidden"
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          disabled={loading}
          className="rounded-2xl border border-cyan-400/60 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Select Video
        </button>
        <p className="mt-2 text-xs text-slate-500">{video ? video.name : 'No video selected'}</p>

        {videoPreview && (
          <div className="mt-4 relative group">
            <video src={videoPreview} className="h-32 w-full rounded-xl object-cover border border-slate-700" />
            <button
              type="button"
              onClick={removeVideo}
              className="absolute top-2 right-2 rounded-full bg-rose-500/80 p-1 text-xs text-white"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || photos.length === 0 && !video}
        className="w-full rounded-3xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Submitting Evidence...' : 'Submit Completion Evidence'}
      </button>
    </div>
  )
}
