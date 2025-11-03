import React, { useRef, useState } from 'react'
import Button from '../components/ui/Button'
import { Upload } from 'lucide-react'
import { toast } from 'react-hot-toast'

const MAX_MB = 5

export default function ImagePicker({ onFileAsBase64 }) {
  const fileRef = useRef(null)
  const [preview, setPreview] = useState(null)

  const handleClick = () => fileRef.current?.click()

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Image size should be less than ${MAX_MB}MB`)
      e.target.value = '' // reset
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result // "data:image/png;base64,AAAA..."
      setPreview(dataUrl)           // show preview
      onFileAsBase64?.(dataUrl)     // send to parent for upload
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="mt-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Course Image
      </label>

      <div className="flex items-center space-x-4">
        <div className="w-32 h-20 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
          {preview ? (
            <img src={preview} alt="Course preview" className="w-full h-full object-cover rounded-lg" />
          ) : (
            <Upload size={24} className="text-gray-400" />
          )}
        </div>

        {/* Hidden input, triggered programmatically */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />

        <Button variant="outline" type="button" onClick={handleClick} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick()}>
          <Upload size={16} className="mr-2" />
          Upload Image
        </Button>
      </div>

      <p className="text-xs text-gray-500 mt-1">
        Recommended: 400×250px, max {MAX_MB}MB
      </p>
    </div>
  )
}
