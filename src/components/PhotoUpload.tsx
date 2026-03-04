'use client'

import { useState, useRef } from 'react'

interface PhotoUploadProps {
  tripId: string
  courseId?: string
  holeNumber?: number
  onUpload?: (url: string) => void
}

export default function PhotoUpload({ tripId, courseId, holeNumber, onUpload }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (caption) formData.append('caption', caption)
      if (courseId) formData.append('course_id', courseId)
      if (holeNumber) formData.append('hole_number', holeNumber.toString())

      const res = await fetch(`/api/trips/${tripId}/photos`, {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        onUpload?.(data.url)
        setPreview(null)
        setCaption('')
        if (fileRef.current) fileRef.current.value = ''
      } else {
        alert('Upload failed')
      }
    } catch {
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function cancel() {
    setPreview(null)
    setCaption('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />

      {!preview ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:border-golf-500"
        >
          <span>📸</span> Photo
        </button>
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 space-y-2">
          <img
            src={preview}
            alt="Preview"
            className="rounded-md max-h-40 w-full object-cover"
          />
          <input
            placeholder="Add a caption..."
            value={caption}
            onChange={e => setCaption(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm dark:bg-gray-700 dark:text-white"
          />
          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 rounded-md bg-golf-700 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Share'}
            </button>
            <button onClick={cancel} className="px-3 py-2 text-sm text-gray-500">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
