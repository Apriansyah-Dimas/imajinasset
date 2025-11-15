'use client'

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

interface SignaturePadProps {
  value: string | null
  onChange: (value: string | null) => void
}

export default function SignaturePad({ value, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawing, setHasDrawing] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(Boolean(value))

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [])

  const redrawStoredSignature = useCallback(() => {
    if (!value) {
      clearCanvas()
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new Image()
    img.src = value
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }
  }, [clearCanvas, value])

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return

    const width = wrapper.clientWidth
    if (!width) return

    const height = 180
    if (canvas.width === width && canvas.height === height) {
      return
    }

    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.lineWidth = 2
      ctx.strokeStyle = "#111827"
    }
    redrawStoredSignature()
  }, [redrawStoredSignature])

  useEffect(() => {
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    return () => window.removeEventListener("resize", resizeCanvas)
  }, [resizeCanvas])

  useEffect(() => {
    if (value) {
      setHasDrawing(true)
      setIsDirty(false)
      setIsConfirmed(true)
      redrawStoredSignature()
    } else if (!isDirty) {
      setHasDrawing(false)
      setIsDirty(false)
      setIsConfirmed(false)
      clearCanvas()
    }
  }, [clearCanvas, isDirty, redrawStoredSignature, value])

  const getCoords = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const { x, y } = getCoords(event)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
    setHasDrawing(true)
    setIsDirty(true)
    setIsConfirmed(false)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    event.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const { x, y } = getCoords(event)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    ctx?.closePath()
  }

  const handleClear = () => {
    clearCanvas()
    setHasDrawing(false)
    setIsDirty(false)
    setIsConfirmed(false)
    onChange(null)
  }

  const handleConfirm = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasDrawing || !isDirty) return
    const signatureData = canvas.toDataURL("image/png")
    onChange(signatureData)
    setIsDirty(false)
    setIsConfirmed(true)
  }

  const helperText = (() => {
    if (isConfirmed) return "Signature confirmed."
    if (hasDrawing && isDirty) return "Click Confirm to save the signature."
    return "Sign inside the box, then Confirm to save."
  })()

  return (
    <div ref={wrapperRef} className="w-full">
      <div className="overflow-hidden rounded-lg border border-dashed border-muted-foreground/60 bg-background">
        <canvas
          ref={canvasRef}
          className="h-44 w-full rounded-t-lg bg-background"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          role="img"
          aria-label="Signature pad"
        />
        <div className="flex flex-col gap-3 border-t border-muted-foreground/30 px-4 py-3 text-sm sm:flex-row sm:items-center">
          <p className="flex-1 text-xs text-muted-foreground">{helperText}</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={!hasDrawing && !value}
            >
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              disabled={!hasDrawing || !isDirty}
            >
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
