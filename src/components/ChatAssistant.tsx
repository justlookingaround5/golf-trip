'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState, useRef, useEffect, useMemo, type FormEvent } from 'react'
import { usePathname } from 'next/navigation'
import SimpleMarkdown from '@/components/SimpleMarkdown'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface SpeechRecognition extends EventTarget {
    continuous: boolean
    interimResults: boolean
    lang: string
    start(): void
    stop(): void
    onresult: ((ev: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null
    onend: (() => void) | null
    onerror: (() => void) | null
  }
  interface SpeechRecognitionConstructor {
    new (): SpeechRecognition
  }
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor
    webkitSpeechRecognition: SpeechRecognitionConstructor
  }
}

export default function ChatAssistant({ tripId }: { tripId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  useEffect(() => { pathnameRef.current = pathname }, [pathname])

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: `/api/trips/${tripId}/assistant`,
      body: () => ({ pageContext: pathnameRef.current }),
    }),
    [tripId]
  )

  const { messages, sendMessage, status } = useChat({ transport })

  const isLoading = status === 'streaming' || status === 'submitted'

  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<globalThis.SpeechRecognition | null>(null)
  const supportsVoice = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  function toggleVoice() {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? ''
      if (transcript) setInput((prev) => (prev ? prev + ' ' + transcript : transcript))
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const suggestions = [
    'Who is winning?',
    "What's the schedule?",
    'Weather forecast',
  ]

  function getMessageText(m: (typeof messages)[number]): string {
    return m.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('')
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  function handleSuggestion(text: string) {
    sendMessage({ text })
  }

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-golf-700 text-white shadow-lg hover:bg-golf-800 transition-colors flex items-center justify-center"
          aria-label="Open chat assistant"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
            />
          </svg>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 z-50 w-full sm:bottom-6 sm:right-6 sm:w-96 flex flex-col bg-white dark:bg-gray-900 sm:rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[80vh] sm:max-h-[600px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-golf-800 text-white sm:rounded-t-lg">
            <div className="flex items-center gap-2">
              <span className="text-lg">⛳</span>
              <h3 className="font-semibold text-sm">ForeLive Assistant</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white"
              aria-label="Close chat"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                  Ask me anything about your trip!
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSuggestion(s)}
                      className="text-xs px-3 py-1.5 rounded-full bg-golf-50 dark:bg-gray-800 text-golf-700 dark:text-golf-400 border border-golf-200 dark:border-gray-600 hover:bg-golf-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => {
              if (m.role !== 'user' && m.role !== 'assistant') return null
              const text = getMessageText(m)
              if (m.role === 'assistant' && !text) return null
              return (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      m.role === 'user'
                        ? 'bg-golf-700 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {m.role === 'assistant' ? (
                      <SimpleMarkdown text={text} />
                    ) : (
                      <p className="whitespace-pre-wrap">{text}</p>
                    )}
                  </div>
                </div>
              )
            })}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 px-3 py-2 border-t border-gray-200 dark:border-gray-700"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your trip..."
              className="flex-1 rounded-full bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-golf-500 text-gray-900 dark:text-gray-100 placeholder-gray-400"
              disabled={isLoading}
            />
            {supportsVoice && (
              <button
                type="button"
                onClick={toggleVoice}
                className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
                aria-label={isListening ? 'Stop listening' : 'Start voice input'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 0 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="h-9 w-9 rounded-full bg-golf-700 text-white flex items-center justify-center hover:bg-golf-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  )
}
