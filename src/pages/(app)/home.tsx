import { useRef, useState } from 'react'
import {
  integration,
  useAuthProfileReady,
  useMutations,
  useQuery,
  useR2Files,
} from 'deepspace'
interface ReportData {
  type: 'lost' | 'found'
  title: string
  description: string
  imageUrl?: string
  category: string
  location: string
  eventDate: number
  createdBy: string
  status: 'open' | 'matched'
  matchedWithId?: string
}
interface MatchAnalysis {
  score: number
  explanation: string
  conflicts: string[]
}
export default function HomePage() {
  const { isSignedIn, user } = useAuthProfileReady({ requireUser: true })
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { records: reports, status } = useQuery<ReportData>('reports')

  const { createConfirmed, putConfirmed, removeConfirmed } = useMutations<ReportData>('reports')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editLocation, setEditLocation] = useState('')

  const [type, setType] = useState<'lost' | 'found'>('lost')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('electronics')
  const [location, setLocation] = useState('')
  const [eventDate, setEventDate] = useState('')

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [aiResults, setAiResults] = useState<Record<string, MatchAnalysis>>({})

  const [analyzingMatch, setAnalyzingMatch] = useState<string | null>(null)

  const { upload, isUploading } = useR2Files({ scope: 'app' })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    setMessage('')
    setError('')

    try {
      const dateAsSeconds = Math.floor(
        new Date(eventDate).getTime() / 1000,
      )


      let imageUrl = ''

      if (imageFile) {
        const uploadResult = await upload(
          imageFile,
          imageFile.name,
        )

        if (!uploadResult.success || !uploadResult.url) {
          throw new Error(
            uploadResult.error ?? 'Image upload failed.',
          )
        }

        imageUrl = uploadResult.url
      }
      await createConfirmed({
        type,
        title,
        description,
        imageUrl,
        category,
        location,
        eventDate: dateAsSeconds,
        createdBy: user?.id ?? '',
        status: 'open',
      })

      setMessage('Report created successfully.')

      setTitle('')
      setDescription('')
      setLocation('')
      setEventDate('')
      setImageFile(null)
      if (fileInputRef.current) {
  fileInputRef.current.value = ''
}
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const isLoading = status === 'loading'

  const handleEdit = (report: {
    recordId: string
    data: ReportData
  }) => {
    setEditingId(report.recordId)
    setEditTitle(report.data.title)
    setEditDescription(report.data.description)
    setEditLocation(report.data.location)
  }
  const handleConfirmMatch = async (
    lostReportId: string,
    foundReportId: string,
  ) => {
    setMessage('')
    setError('')

    try {
      await putConfirmed(lostReportId, {
        status: 'matched',
        matchedWithId: foundReportId,
      })

      setMessage('Match confirmed successfully.')
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : String(err),
      )
    }
  }
  const handleSave = async (recordId: string) => {
    setMessage('')
    setError('')

    try {
      await putConfirmed(recordId, {
        title: editTitle,
        description: editDescription,
        location: editLocation,
      })

      setEditingId(null)
      setMessage('Report updated successfully.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }
  const handleDelete = async (recordId: string) => {
    setMessage('')
    setError('')

    try {
      await removeConfirmed(recordId)
      setMessage('Report deleted successfully.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const getCandidateMatches = (currentReportId: string) => {
    if (!reports) return []

    const current = reports.find(
      (report) => report.recordId === currentReportId,
    )

    if (!current) return []

    return reports.filter((report) => {
      if (report.recordId === currentReportId) return false

      const oppositeType =
        current.data.type === 'lost' ? 'found' : 'lost'

      if (report.data.type !== oppositeType) return false

      if (report.data.category !== current.data.category) return false

      const dateDifference =
        Math.abs(report.data.eventDate - current.data.eventDate)

      const threeDaysInSeconds = 3 * 24 * 60 * 60

      if (dateDifference > threeDaysInSeconds) return false

      const currentLocation =
        current.data.location.toLowerCase()

      const candidateLocation =
        report.data.location.toLowerCase()

      const locationLooksRelated =
        currentLocation.includes(candidateLocation) ||
        candidateLocation.includes(currentLocation) ||
        currentLocation
          .split(' ')
          .some((word) =>
            word.length > 2 &&
            candidateLocation.includes(word),
          )

      return true
    })
  }

  const handleAnalyzeMatch = async (
    lostReport: {
      recordId: string
      data: ReportData
    },
    foundReport: {
      recordId: string
      data: ReportData
    },
  ) => {
    const matchKey =
      `${lostReport.recordId}:${foundReport.recordId}`

    setAnalyzingMatch(matchKey)
    setError('')

    try {
      const prompt = `
You are helping a lost-and-found application decide whether two reports may describe the same physical item.

LOST ITEM:
Title: ${lostReport.data.title}
Description: ${lostReport.data.description}
Category: ${lostReport.data.category}
Location: ${lostReport.data.location}

FOUND ITEM:
Title: ${foundReport.data.title}
Description: ${foundReport.data.description}
Category: ${foundReport.data.category}
Location: ${foundReport.data.location}

Compare the meaning of the descriptions.

Return ONLY valid JSON in exactly this format:

{
  "score": 0,
  "explanation": "short explanation",
  "conflicts": ["conflict 1", "conflict 2"]
}

The score must be between 0 and 100.

Do not decide ownership of the item.
Only estimate whether the reports could describe the same item.
`

      const result = await integration.post<{
        choices?: Array<{
          message?: {
            content?: string
          }
        }>
      }>('openai/chat-completion', {
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      if (!result.success || !result.data) {
        throw new Error(
          result.error ?? 'AI analysis failed',
        )
      }

      const content =
        result.data.choices?.[0]?.message?.content

      if (!content) {
        throw new Error('AI returned an empty response.')
      }

      const cleaned = content
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim()

      const analysis =
        JSON.parse(cleaned) as MatchAnalysis

      setAiResults((current) => ({
        ...current,
        [matchKey]: analysis,
      }))
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : String(err),
      )
    } finally {
      setAnalyzingMatch(null)
    }
  }
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">FoundIt</h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Report lost and found items and discover possible matches.
        </p>

        {isSignedIn && user && (
          <p className="mt-2 text-xs text-muted-foreground">
            Signed in as {user.name ?? user.email}
          </p>
        )}
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <section className="rounded-lg border border-border p-5">
          <h2 className="mb-4 text-xl font-semibold">
            Create Report
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Report Type
              </label>

              <select
                value={type}
                onChange={(e) =>
                  setType(e.target.value as 'lost' | 'found')
                }
                className="w-full rounded border border-border bg-background px-3 py-2"
              >
                <option value="lost">Lost</option>
                <option value="found">Found</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Title
              </label>

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Black AirPods Pro"
                className="w-full rounded border border-border bg-background px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Description
              </label>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="Small scratch on the back..."
                className="w-full rounded border border-border bg-background px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Category
              </label>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded border border-border bg-background px-3 py-2"
              >
                <option value="electronics">Electronics</option>
                <option value="wallet">Wallet</option>
                <option value="keys">Keys</option>
                <option value="clothing">Clothing</option>
                <option value="documents">Documents</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Location
              </label>

              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                placeholder="FAST Library"
                className="w-full rounded border border-border bg-background px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Date
              </label>

              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
                className="w-full rounded border border-border bg-background px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Photo (optional)
              </label>

              <input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  onChange={(e) => {
    const file = e.target.files?.[0] ?? null
    setImageFile(file)
  }}
  className="w-full rounded border border-border bg-background px-3 py-2"
/>
            </div>


            <button
              type="submit"
              disabled={isUploading}
              className="w-full rounded bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : 'Create Report'}
            </button>
          </form>

          {message && (
            <p className="mt-4 text-sm text-green-600">{message}</p>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-600">{error}</p>
          )}
        </section>

        <section className="rounded-lg border border-border p-5">
          <h2 className="mb-4 text-xl font-semibold">
            Reports
          </h2>

          {isLoading && (
            <p className="text-sm text-muted-foreground">
              Loading reports...
            </p>
          )}

          {!isLoading && (!reports || reports.length === 0) && (
            <p className="text-sm text-muted-foreground">
              No reports yet.
            </p>
          )}

          <div className="space-y-3">
            {reports?.map((report) => (
              <div
                key={report.recordId}
                className="rounded border border-border p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">
                    {report.data.title}
                  </h3>

                  <span className="text-xs uppercase text-muted-foreground">
                    {report.data.type}
                  </span>
                </div>

                {editingId === report.recordId ? (
                  <div className="mt-3 space-y-3">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded border border-border bg-background px-3 py-2"
                    />

                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full rounded border border-border bg-background px-3 py-2"
                    />

                    <input
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className="w-full rounded border border-border bg-background px-3 py-2"
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(report.recordId)}
                        className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
                      >
                        Save
                      </button>

                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded border border-border px-3 py-1 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>


                    {report.data.imageUrl && (
                      <img
                        src={report.data.imageUrl}
                        alt={report.data.title}
                        className="mb-3 h-40 w-full rounded object-contain"
                      />
                    )}
                    <p className="mt-2 text-sm">
                      {report.data.description}
                    </p>
                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                      <p>Category: {report.data.category}</p>
                      <p>Location: {report.data.location}</p>
                      {report.data.status === 'matched' && (
                        <p className="font-medium">
                          ✓ Match confirmed
                        </p>
                      )}
                    </div>
                    {report.data.type === 'lost' && report.data.status === 'open' && getCandidateMatches(report.recordId).length > 0 && (
                      <div className="mt-4 rounded border border-border bg-muted/30 p-3">
                        <p className="mb-2 text-sm font-medium">
                          Possible matches
                        </p>

                        <div className="space-y-2">
                          {getCandidateMatches(report.recordId).map((candidate) => {
                            const matchKey =
                              `${report.recordId}:${candidate.recordId}`

                            const analysis = aiResults[matchKey]

                            return (
                              <div
                                key={candidate.recordId}
                                className="rounded border border-border bg-background p-3"
                              >
                                <p className="text-sm font-medium">
                                  {candidate.data.title}
                                </p>

                                <p className="mt-1 text-xs text-muted-foreground">
                                  {candidate.data.location}
                                </p>

                                {!analysis && (
                                  <button
                                    onClick={() =>
                                      handleAnalyzeMatch(report, candidate)
                                    }
                                    disabled={analyzingMatch === matchKey}
                                    className="mt-3 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                                  >
                                    {analyzingMatch === matchKey
                                      ? 'Analyzing...'
                                      : 'Analyze with AI'}
                                  </button>
                                )}

                                {analysis && (
                                  <div className="mt-3 rounded border border-border p-3">
                                    <p className="font-semibold">
                                      AI Match Score: {analysis.score}%
                                    </p>

                                    <p className="mt-2 text-sm">
                                      {analysis.explanation}
                                    </p>

                                    {analysis.conflicts.length > 0 && (
                                      <div className="mt-2">
                                        <p className="text-xs font-medium">
                                          Possible conflicts:
                                        </p>

                                        <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                                          {analysis.conflicts.map(
                                            (conflict, index) => (
                                              <li key={index}>
                                                {conflict}
                                              </li>
                                            ),
                                          )}
                                        </ul>
                                      </div>
                                    )}
                                    {report.data.createdBy === user?.id &&
                                      report.data.status !== 'matched' && (
                                        <button
                                          onClick={() =>
                                            handleConfirmMatch(
                                              report.recordId,
                                              candidate.recordId,
                                            )
                                          }
                                          className="mt-3 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                                        >
                                          Confirm Match
                                        </button>
                                      )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {report.data.createdBy === user?.id && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleEdit(report)}
                          className="rounded border border-border px-3 py-1 text-sm"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(report.recordId)}
                          className="rounded bg-destructive/10 px-3 py-1 text-sm text-destructive"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}