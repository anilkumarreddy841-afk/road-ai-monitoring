import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'

const promptText = `Build a world-class AI-Powered Smart Road Infrastructure Management System.
Analyze this road image and GPS location for automatic detection, monitoring, and management of road damage.
Detect potholes, cracks, edge failures, broken roads, damaged bridges, uneven surfaces, missing lane markings, waterlogging, and other infrastructure problems.
Automatically capture GPS coordinates, date, time, road name, district, city, state, weather conditions, and device information.
Classify every damage event as Minor, Moderate, Major, or Critical with confidence scores.
Estimate damaged road length, width, depth (if available), damaged area, total damaged percentage, repair priority, and expected remaining road life.
Return a structured report with Road ID, Road Name, GPS Location, District, Damage Type, Damage Severity, Damaged Length, Damaged Width, Total Area, Materials Required, Estimated Cost, Contractor Assignment, Expected Start Date, Expected Completion Date, Budget Approval Status, and Engineer Verification Status.`

export default function AIPromptPage() {
  const [copyMessage, setCopyMessage] = useState<string | null>(null)

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(promptText)
      setCopyMessage('AI prompt copied to clipboard')
      window.setTimeout(() => setCopyMessage(null), 2500)
    } catch (error) {
      setCopyMessage('Unable to copy. Please copy manually.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100 sm:px-10">
      <Head>
        <title>AI Prompt | SmartRoads</title>
      </Head>

      <div className="mx-auto max-w-5xl rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-xl shadow-slate-900/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">AI Prompt Library</h1>
            <p className="mt-2 text-slate-400">
              Copy the full AI damage detection prompt for use in your computer vision services, model pipelines, and integration tests.
            </p>
          </div>
          <Link href="/" className="inline-flex items-center justify-center rounded-3xl border border-slate-700 bg-slate-950/90 px-5 py-3 text-sm text-white transition hover:border-cyan-400 hover:text-cyan-200">
            Back to dashboard
          </Link>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">Prompt</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Smart Road Infrastructure AI Prompt</h2>
            </div>
            <button
              onClick={copyPrompt}
              className="rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Copy prompt
            </button>
          </div>

          <pre className="mt-6 overflow-x-auto rounded-3xl bg-slate-950 p-5 text-sm leading-6 text-slate-100">
            {promptText}
          </pre>

          {copyMessage ? (
            <div className="mt-4 rounded-3xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
              {copyMessage}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
